import { useEffect, useRef } from 'react';
import type { RoomDetail } from '../components/SetupScreen';
import type { GameState } from '../types/game';
import { soundManager } from './soundManager';

interface UseGameSfxParams {
  currentRoom: RoomDetail | null;
  gameState: GameState | null;
  myPlayerId: string | null;
  canIActNow: boolean;
  turnTimerSeconds: number | null;
}

export function useGameSfx({
  currentRoom,
  gameState,
  myPlayerId,
  canIActNow,
  turnTimerSeconds,
}: UseGameSfxParams) {
  const prevRoomRef = useRef<{ code: string; seatCount: number } | null>(null);
  const prevGameStateRef = useRef<GameState | null>(null);
  const prevCanActRef = useRef<boolean>(false);
  const lastLogIdRef = useRef<number>(0);
  const prevTimerRef = useRef<number | null>(null);

  // Lobby join / leave doorbell SFX
  useEffect(() => {
    if (!currentRoom) {
      prevRoomRef.current = null;
      return;
    }

    const prev = prevRoomRef.current;
    const nextSeatCount = currentRoom.seats.length;

    if (prev && prev.code === currentRoom.code && currentRoom.status === 'waiting') {
      if (nextSeatCount > prev.seatCount) {
        soundManager.play('room_join');
      } else if (nextSeatCount < prev.seatCount) {
        soundManager.play('room_leave');
      }
    } else if (!prev && currentRoom.status === 'waiting' && !gameState) {
      soundManager.play('room_join');
    }

    prevRoomRef.current = { code: currentRoom.code, seatCount: nextSeatCount };
  }, [currentRoom, gameState]);

  // Turn countdown urgent tick (last 5 seconds when it's your action)
  useEffect(() => {
    if (!gameState || !canIActNow || gameState.phase === 'game_over') {
      prevTimerRef.current = turnTimerSeconds;
      return;
    }
    if (
      turnTimerSeconds !== null &&
      turnTimerSeconds > 0 &&
      turnTimerSeconds <= 5 &&
      turnTimerSeconds !== prevTimerRef.current
    ) {
      soundManager.play('turn_timer_tick');
    }
    prevTimerRef.current = turnTimerSeconds;
  }, [turnTimerSeconds, canIActNow, gameState]);

  // Gameplay state diff + log diff SFX scheduler
  useEffect(() => {
    if (!gameState) {
      prevGameStateRef.current = null;
      prevCanActRef.current = false;
      lastLogIdRef.current = 0;
      return;
    }

    const prevState = prevGameStateRef.current;
    const prevCanAct = prevCanActRef.current;

    const maxLogId = gameState.logs.reduce((max, l) => Math.max(max, l.id), 0);

    // First snapshot entering a game
    if (!prevState) {
      prevGameStateRef.current = gameState;
      prevCanActRef.current = canIActNow;
      lastLogIdRef.current = maxLogId;

      if (gameState.turnNumber <= 1 && gameState.logs.length <= 4 && gameState.phase !== 'game_over') {
        soundManager.play('game_start');
        if (canIActNow) {
          soundManager.play('your_turn', 480);
        }
      }
      return;
    }

    const newLogs = gameState.logs.filter((l) => l.id > lastLogIdRef.current);
    if (maxLogId > lastLogIdRef.current) {
      lastLogIdRef.current = maxLogId;
    }

    const logTexts = newLogs.map((l) => l.text);
    const hasLog = (needle: string) => logTexts.some((t) => t.includes(needle));

    let offset = 0;

    // 1. Dice roll
    const diceChanged =
      gameState.lastDice !== null &&
      (!prevState.lastDice ||
        prevState.lastDice.label !== gameState.lastDice.label ||
        prevState.lastDice.d6 !== gameState.lastDice.d6 ||
        prevState.lastDice.d4 !== gameState.lastDice.d4);

    if (diceChanged) {
      soundManager.play('dice_roll', 0);
      offset = 170;
    }

    // 2. Card draw & Hermit prompt
    const drawSeqChanged =
      (gameState.lastDrawnSeq ?? 0) !== (prevState.lastDrawnSeq ?? 0) ||
      gameState.lastDrawnCard?.uid !== prevState.lastDrawnCard?.uid;
    const newCard = gameState.lastDrawnCard && drawSeqChanged ? gameState.lastDrawnCard : null;

    if (newCard) {
      if (newCard.id === 'handgun') soundManager.play('handgun_draw', offset);
      else if (newCard.id === 'chainsaw') soundManager.play('chainsaw_draw', offset);
      else if (newCard.deck === 'white') soundManager.play('card_draw_white', offset);
      else if (newCard.deck === 'black') soundManager.play('card_draw_black', offset);
      else soundManager.play('card_draw_hermit', offset);
    } else if (
      gameState.pending?.type === 'hermit_response' &&
      prevState.pending?.type !== 'hermit_response'
    ) {
      soundManager.play('card_draw_hermit', offset);
    }

    // 3. Pending prompt cues (Roll 7 / Emi Teleport / Werewolf counter)
    if (
      gameState.pending?.type === 'choose_area_roll7' &&
      prevState.pending?.type !== 'choose_area_roll7'
    ) {
      soundManager.play('roll_seven', offset + 120);
    }
    if (
      gameState.pending?.type === 'choose_emi_move' &&
      prevState.pending?.type !== 'choose_emi_move'
    ) {
      soundManager.play('teleport', 0);
    }
    if (
      gameState.pending?.type === 'werewolf_counter' &&
      prevState.pending?.type !== 'werewolf_counter'
    ) {
      soundManager.play('counter_attack', offset + 80);
    }

    // 4. Player movement, reveals, abilities, equipment, damage, heals, deaths
    const prevById = new Map(prevState.players.map((p) => [p.id, p]));
    let anyMoved = false;
    let maxDmgTaken = 0;
    let anyHealed = false;
    let anyDied = false;
    let anyAbilityUsed = false;
    const revealedFactions = new Set<'Shadow' | 'Hunter' | 'Neutral'>();

    let prevEquipTotal = 0;
    let nextEquipTotal = 0;
    let anyGainedEquip = false;
    let anyLostEquip = false;

    for (const nextP of gameState.players) {
      const prevP = prevById.get(nextP.id);
      if (!prevP) continue;

      prevEquipTotal += prevP.equipment.length;
      nextEquipTotal += nextP.equipment.length;
      if (nextP.equipment.length > prevP.equipment.length) anyGainedEquip = true;
      if (nextP.equipment.length < prevP.equipment.length) anyLostEquip = true;

      if (nextP.areaId && prevP.areaId !== nextP.areaId) anyMoved = true;
      if (nextP.damage > prevP.damage) {
        maxDmgTaken = Math.max(maxDmgTaken, nextP.damage - prevP.damage);
      }
      if (nextP.damage < prevP.damage) anyHealed = true;
      if (prevP.alive && !nextP.alive) anyDied = true;
      if (!prevP.revealed && nextP.revealed) {
        revealedFactions.add(nextP.character.faction);
      }
      if (!prevP.abilityUsed && nextP.abilityUsed) {
        anyAbilityUsed = true;
      }
    }

    if (anyMoved) {
      if (prevState.pending?.type === 'choose_emi_move' || hasLog('Teleport')) {
        soundManager.play('teleport', offset);
      } else {
        soundManager.play('move_area', offset);
      }
    }

    // Equipment equip vs steal
    const wasStole =
      hasLog('stole ') ||
      hasLog('Stole ') ||
      (anyGainedEquip && anyLostEquip && prevEquipTotal === nextEquipTotal);
    if (wasStole) {
      soundManager.play('steal_item', offset + 120);
    } else if (anyGainedEquip) {
      soundManager.play('equip_item', offset + 100);
    }

    // Dynamite & Combat & Shields & Heal
    const dynamiteExploded = hasLog('Dynamite explodes');
    const shieldBlocked =
      hasLog('is protected and takes 0 damage') ||
      hasLog('Ghostly Barrier blocks') ||
      hasLog('Talisman blocks');
    const attackMissed = hasLog('attack missed');

    const attackerFromLog = newLogs
      .map((l) => l.text.match(/\(Attack by ([^)]+)\)/)?.[1])
      .find(Boolean);
    const attackerPlayer = attackerFromLog
      ? gameState.players.find((p) => p.name === attackerFromLog)
      : null;
    const isHandgunAttackHit =
      maxDmgTaken > 0 &&
      Boolean(attackerPlayer?.equipment.some((eq) => eq.id === 'handgun'));

    if (dynamiteExploded) {
      soundManager.play('dynamite_boom', offset);
    } else if (shieldBlocked && maxDmgTaken === 0) {
      soundManager.play('shield_block', offset);
    } else if (attackMissed && maxDmgTaken === 0) {
      soundManager.play('attack_miss', offset);
    } else if (isHandgunAttackHit) {
      soundManager.play('handgun_hit', offset);
    } else if (maxDmgTaken >= 3) {
      soundManager.play('attack_heavy', offset);
    } else if (maxDmgTaken > 0) {
      soundManager.play('attack_hit', offset);
    }

    if (anyHealed) {
      soundManager.play('heal', maxDmgTaken > 0 ? offset + 140 : offset);
    }

    // Special ability activation
    if (anyAbilityUsed && prevState.pending?.type !== 'choose_emi_move') {
      soundManager.play('special_ability', 0);
    }

    // Reveal faction SFX
    let revealOffset = offset + 160;
    for (const faction of revealedFactions) {
      if (faction === 'Shadow') soundManager.play('reveal_shadow', revealOffset);
      else if (faction === 'Hunter') soundManager.play('reveal_hunter', revealOffset);
      else soundManager.play('reveal_neutral', revealOffset);
      revealOffset += 120;
    }

    // Death SFX
    if (anyDied) {
      soundManager.play('player_death', offset + 280);
    }

    // Game Over Victory / Defeat
    if (prevState.phase !== 'game_over' && gameState.phase === 'game_over') {
      const won =
        myPlayerId !== null &&
        gameState.winners.some((w) => w.playerId === myPlayerId);
      soundManager.play(won ? 'victory' : 'defeat', anyDied ? 680 : 320);
    } else if (!prevCanAct && canIActNow) {
      // Your turn alert
      soundManager.play('your_turn', anyMoved || diceChanged ? 220 : 80);
    }

    prevGameStateRef.current = gameState;
    prevCanActRef.current = canIActNow;
  }, [gameState, canIActNow, myPlayerId]);
}
