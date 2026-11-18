import {
  AREAS,
  AREA_LIST,
  BLACK_CARD_TEMPLATES,
  CHARACTERS,
  FACTION_DISTRIBUTION,
  HERMIT_CARD_TEMPLATES,
  PLAYER_COLORS,
  WHITE_CARD_TEMPLATES,
  buildDeck,
  shuffle,
} from '../data/cards.ts';
import type {
  AreaId,
  CardDef,
  DeckType,
  GameConfig,
  GameState,
  LogEntry,
  PlayerState,
} from '../types/game.ts';

let logIdCounter = 1;

function addLog(
  logs: LogEntry[],
  turn: number,
  text: string,
  tone: LogEntry['tone'] = 'info',
  privacy?: { publicText: string; visibleTo: string[] }
): LogEntry[] {
  return [
    {
      id: logIdCounter++,
      turn,
      text,
      tone,
      ...(privacy ? { publicText: privacy.publicText, visibleTo: privacy.visibleTo } : {}),
    },
    ...logs,
  ].slice(0, 120);
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1;
}

export function getAreaByRollSum(sum: number): AreaId | null {
  for (const area of AREA_LIST) {
    if (area.numbers.includes(sum)) return area.id;
  }
  return null;
}

export function getZoneIndex(zones: [AreaId, AreaId][], areaId: AreaId | null): number {
  if (!areaId) return -1;
  return zones.findIndex((z) => z[0] === areaId || z[1] === areaId);
}

export function getAdjacentAreas(zones: [AreaId, AreaId][], areaId: AreaId | null): AreaId[] {
  if (!areaId) return AREA_LIST.map((a) => a.id);
  const flat = zones.flat();
  const idx = flat.indexOf(areaId);
  if (idx === -1) return [];
  const prev = flat[(idx - 1 + flat.length) % flat.length];
  const next = flat[(idx + 1) % flat.length];
  const zoneIdx = getZoneIndex(zones, areaId);
  const partner = zones[zoneIdx][0] === areaId ? zones[zoneIdx][1] : zones[zoneIdx][0];
  return Array.from(new Set([partner, prev, next])).filter((id) => id !== areaId);
}

export function createInitialGameState(config: GameConfig): GameState {
  logIdCounter = 1;
  const dist = FACTION_DISTRIBUTION[config.playerCount] || FACTION_DISTRIBUTION[6];
  const pool = CHARACTERS.filter((c) =>
    config.includeExpansion ? c.id !== 'bob' : !c.isExpansion
  );

  const hunters = shuffle(pool.filter((c) => c.faction === 'Hunter')).slice(0, dist.Hunter);
  const shadows = shuffle(pool.filter((c) => c.faction === 'Shadow')).slice(0, dist.Shadow);
  const neutrals = shuffle(pool.filter((c) => c.faction === 'Neutral')).slice(0, dist.Neutral);
  const dealtChars = shuffle([...hunters, ...shadows, ...neutrals]);

  const players: PlayerState[] = [];
  for (let i = 0; i < config.playerCount; i++) {
    const isHuman = i < config.humanCount;
    const defaultName = isHuman
      ? config.humanNames[i]?.trim() || `Player ${i + 1}`
      : `Bot ${i + 1}`;
    players.push({
      id: `p_${i}`,
      name: defaultName,
      isHuman,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      character: dealtChars[i],
      damage: 0,
      revealed: false,
      areaId: null,
      equipment: [],
      alive: true,
      deathOrder: null,
      abilityUsed: false,
      abilityVoided: false,
      guardianAngelActive: false,
      ghostlyBarrierActive: false,
      extraTurns: 0,
      agnesTarget: 'above',
      fukaPendingNextTurn: false,
      knownIdentities: { [`p_${i}`]: dealtChars[i].faction },
    });
  }

  const zones: [AreaId, AreaId][] = [
    ['hermit_cabin', 'underworld_gate'],
    ['church', 'cemetery'],
    ['weird_woods', 'erstwhile_altar'],
  ];

  const state: GameState = {
    config,
    phase: 'start_turn',
    turnNumber: 1,
    currentPlayerIndex: 0,
    players,
    zones,
    whiteDeck: buildDeck(WHITE_CARD_TEMPLATES),
    whiteDiscard: [],
    blackDeck: buildDeck(BLACK_CARD_TEMPLATES),
    blackDiscard: [],
    hermitDeck: buildDeck(HERMIT_CARD_TEMPLATES),
    hermitDiscard: [],
    lastDice: null,
    pending: null,
    winners: [],
    logs: addLog(
      [],
      1,
      `Game started with ${config.playerCount} players (${dist.Hunter} Hunters, ${dist.Shadow} Shadows, ${dist.Neutral} Neutrals).`,
      'info'
    ),
    deadCount: 0,
    hasMoved: false,
    hasUsedArea: false,
    hasAttacked: false,
    lastDrawnCard: null,
  };

  return beginTurn(state);
}

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function hasEquipment(player: PlayerState, cardId: string): boolean {
  return player.equipment.some((e) => e.id === cardId);
}

export function getAttackRangeTargets(state: GameState, attackerId: string): PlayerState[] {
  const attacker = state.players.find((p) => p.id === attackerId);
  if (!attacker || !attacker.alive || !attacker.areaId) return [];

  const handgun = hasEquipment(attacker, 'handgun');
  const attackerZone = getZoneIndex(state.zones, attacker.areaId);

  return state.players.filter((p) => {
    if (p.id === attacker.id || !p.alive || !p.areaId) return false;
    if (handgun) {
      return p.areaId !== attacker.areaId;
    }
    return getZoneIndex(state.zones, p.areaId) === attackerZone;
  });
}

export function drawCardFromDeck(
  state: GameState,
  deckType: DeckType
): { state: GameState; card: CardDef | null } {
  let deck =
    deckType === 'white'
      ? [...state.whiteDeck]
      : deckType === 'black'
      ? [...state.blackDeck]
      : [...state.hermitDeck];
  let discard =
    deckType === 'white'
      ? [...state.whiteDiscard]
      : deckType === 'black'
      ? [...state.blackDiscard]
      : [...state.hermitDiscard];

  if (deck.length === 0 && discard.length > 0) {
    deck = shuffle(discard);
    discard = [];
  }

  if (deck.length === 0) {
    return { state, card: null };
  }

  const card = deck[0];
  const nextDeck = deck.slice(1);

  const nextState: GameState = {
    ...state,
    whiteDeck: deckType === 'white' ? nextDeck : state.whiteDeck,
    whiteDiscard: deckType === 'white' ? discard : state.whiteDiscard,
    blackDeck: deckType === 'black' ? nextDeck : state.blackDeck,
    blackDiscard: deckType === 'black' ? discard : state.blackDiscard,
    hermitDeck: deckType === 'hermit' ? nextDeck : state.hermitDeck,
    hermitDiscard: deckType === 'hermit' ? discard : state.hermitDiscard,
    lastDrawnCard: card,
  };

  return { state: nextState, card };
}

export function discardCard(state: GameState, card: CardDef): GameState {
  if (card.deck === 'white') {
    return { ...state, whiteDiscard: [...state.whiteDiscard, card] };
  }
  if (card.deck === 'black') {
    return { ...state, blackDiscard: [...state.blackDiscard, card] };
  }
  return { ...state, hermitDiscard: [...state.hermitDiscard, card] };
}

export function revealPlayer(state: GameState, playerId: string, reason?: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.revealed) return state;

  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, revealed: true } : p
  );
  // Everyone now knows this player's faction
  const updatedPlayers = players.map((p) => ({
    ...p,
    knownIdentities: { ...p.knownIdentities, [playerId]: player.character.faction },
  }));

  const msg = reason
    ? `${player.name} revealed as ${player.character.name} (${player.character.faction}) — ${reason}!`
    : `${player.name} revealed their identity: ${player.character.name} (${player.character.faction})!`;

  return {
    ...state,
    players: updatedPlayers,
    logs: addLog(state.logs, state.turnNumber, msg, 'reveal'),
  };
}

export function healPlayer(
  state: GameState,
  playerId: string,
  amount: number,
  sourceText?: string,
  privacy?: { publicSourceText: string; visibleTo: string[] }
): GameState {
  const target = state.players.find((p) => p.id === playerId);
  if (!target || !target.alive || amount <= 0) return state;
  const newDamage = Math.max(0, target.damage - amount);
  const healed = target.damage - newDamage;
  if (healed === 0) return state;

  const hpDisplay = target.revealed ? `${newDamage}/${target.character.maxHp}` : `${newDamage} dmg`;
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, damage: newDamage } : p
    ),
    logs: addLog(
      state.logs,
      state.turnNumber,
      `${target.name} healed ${healed} damage${sourceText ? ` (${sourceText})` : ''} (${hpDisplay}).`,
      'heal',
      privacy
        ? {
            publicText: `${target.name} healed ${healed} damage (${privacy.publicSourceText}) (${hpDisplay}).`,
            visibleTo: privacy.visibleTo,
          }
        : undefined
    ),
  };
}

export function applyDamage(
  state: GameState,
  targetId: string,
  rawAmount: number,
  options: {
    sourcePlayerId?: string;
    isAttack?: boolean;
    cardId?: string;
    isWeirdWoods?: boolean;
    reason?: string;
    publicReason?: string;
    visibleTo?: string[];
  } = {}
): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.alive) return state;

  // Protection checks
  if (options.isAttack && (target.guardianAngelActive || target.ghostlyBarrierActive)) {
    return {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${target.name} is protected and takes 0 damage!`,
        'combat'
      ),
    };
  }
  if (target.ghostlyBarrierActive) {
    return {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${target.name}'s Ghostly Barrier blocks all damage!`,
        'combat'
      ),
    };
  }
  if (
    options.cardId &&
    ['bloodthirsty_spider', 'vampire_bat', 'dynamite'].includes(options.cardId) &&
    hasEquipment(target, 'talisman')
  ) {
    return {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${target.name}'s Talisman blocks damage from ${options.reason || options.cardId}!`,
        'card'
      ),
    };
  }
  if (options.isWeirdWoods && hasEquipment(target, 'fortune_brooch')) {
    return {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${target.name}'s Fortune Brooch blocks Weird Woods damage!`,
        'card'
      ),
    };
  }

  let amount = Math.max(0, rawAmount);
  if (options.isAttack && hasEquipment(target, 'holy_robe')) {
    amount = Math.max(0, amount - 1);
  }

  if (amount <= 0) {
    return {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${target.name} takes 0 damage${options.reason ? ` (${options.reason})` : ''}.`,
        'combat'
      ),
    };
  }

  const newDamage = target.damage + amount;
  const hpDisplay = target.revealed ? `${newDamage}/${target.character.maxHp}` : `${newDamage} dmg`;
  const dmgPrivacy =
    options.publicReason && options.visibleTo
      ? {
          publicText: `${target.name} takes ${amount} damage (${options.publicReason}) (${hpDisplay}).`,
          visibleTo: options.visibleTo,
        }
      : undefined;

  let nextState: GameState = {
    ...state,
    players: state.players.map((p) =>
      p.id === targetId ? { ...p, damage: newDamage } : p
    ),
    logs: addLog(
      state.logs,
      state.turnNumber,
      `${target.name} takes ${amount} damage${options.reason ? ` (${options.reason})` : ''} (${hpDisplay}).`,
      'combat',
      dmgPrivacy
    ),
  };

  // Check death
  if (newDamage >= target.character.maxHp) {
    const newDeadCount = nextState.deadCount + 1;
    nextState = {
      ...nextState,
      deadCount: newDeadCount,
      players: nextState.players.map((p) =>
        p.id === targetId
          ? { ...p, alive: false, revealed: true, deathOrder: newDeadCount }
          : {
              ...p,
              knownIdentities: {
                ...p.knownIdentities,
                [targetId]: target.character.faction,
              },
            }
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `💀 ${target.name} (${target.character.name} - ${target.character.faction}) has died!`,
        'death'
      ),
    };

    // Daniel special ability: once a character dies, Daniel's identity is revealed
    const daniel = nextState.players.find(
      (p) => p.character.id === 'daniel' && p.alive && !p.revealed && !p.abilityVoided
    );
    if (daniel) {
      nextState = revealPlayer(nextState, daniel.id, 'Scream triggered on death');
    }

    // Bryan special ability & win condition
    if (options.isAttack && options.sourcePlayerId) {
      const killer = nextState.players.find((p) => p.id === options.sourcePlayerId);
      if (killer && killer.character.id === 'bryan' && !killer.abilityVoided) {
        if (target.character.maxHp <= 12 && !killer.revealed) {
          nextState = revealPlayer(nextState, killer.id, 'My Mistake (killed <=12 HP)');
        }
      }
      // Kill loot if victim had equipment and killer is alive
      if (killer && killer.alive && target.equipment.length > 0) {
        const takeAll =
          hasEquipment(killer, 'silver_rosary') ||
          (killer.character.id === 'bob_ex' && killer.revealed && !killer.abilityVoided);
        if (takeAll || target.equipment.length === 1) {
          const looted = takeAll ? target.equipment : [target.equipment[0]];
          nextState = transferEquipment(nextState, target.id, killer.id, looted);
        } else {
          nextState = {
            ...nextState,
            pending: {
              type: 'kill_loot',
              killerId: killer.id,
              victimId: target.id,
              count: 1,
            },
          };
        }
      }
    }

    nextState = evaluateWinConditions(nextState, {
      killerId: options.sourcePlayerId,
      killedId: targetId,
      isAttackKill: Boolean(options.isAttack),
    });
  }

  return nextState;
}

export function transferEquipment(
  state: GameState,
  fromId: string,
  toId: string,
  cards: CardDef[]
): GameState {
  const from = state.players.find((p) => p.id === fromId);
  const to = state.players.find((p) => p.id === toId);
  if (!from || !to || cards.length === 0) return state;

  const uids = new Set(cards.map((c) => c.uid));
  const remaining = from.equipment.filter((e) => !uids.has(e.uid));
  const gained = [...to.equipment, ...cards];

  const nextState: GameState = {
    ...state,
    players: state.players.map((p) => {
      if (p.id === fromId) return { ...p, equipment: remaining };
      if (p.id === toId) return { ...p, equipment: gained };
      return p;
    }),
    logs: addLog(
      state.logs,
      state.turnNumber,
      `${to.name} took ${cards.map((c) => c.name).join(', ')} from ${from.name}.`,
      'card'
    ),
  };

  return evaluateWinConditions(nextState);
}

export function evaluateWinConditions(
  state: GameState,
  killContext?: { killerId?: string; killedId?: string; isAttackKill?: boolean }
): GameState {
  if (state.phase === 'game_over') return state;

  const winners: { playerId: string; reason: string }[] = [];
  const alivePlayers = state.players.filter((p) => p.alive);
  const hunters = state.players.filter((p) => p.character.faction === 'Hunter');
  const shadows = state.players.filter((p) => p.character.faction === 'Shadow');
  const neutrals = state.players.filter((p) => p.character.faction === 'Neutral');

  const allShadowsDead = shadows.length > 0 && shadows.every((p) => !p.alive);
  const allHuntersDead = hunters.length > 0 && hunters.every((p) => !p.alive);
  const threeNeutralsDead = neutrals.filter((p) => !p.alive).length >= 3;

  // 1. Hunters win
  if (allShadowsDead) {
    for (const h of hunters) {
      winners.push({ playerId: h.id, reason: 'All Shadows are dead' });
    }
  }

  // 2. Shadows win
  if (allHuntersDead || threeNeutralsDead) {
    const reason = allHuntersDead ? 'All Hunters are dead' : '3 Neutrals are dead';
    for (const s of shadows) {
      winners.push({ playerId: s.id, reason });
    }
  }

  // 3. Individual Neutral wins
  for (const p of state.players) {
    const cid = p.character.id;
    if (cid === 'bob' && p.alive && p.equipment.length >= 5) {
      winners.push({ playerId: p.id, reason: 'Possesses 5+ Equipment cards' });
    }
    if (cid === 'bob_ex' && p.alive && p.equipment.length >= 4) {
      winners.push({ playerId: p.id, reason: 'Possesses 4+ Equipment cards' });
    }
    if (cid === 'david' && p.alive) {
      const targetIds = ['talisman', 'spear_of_longinus', 'holy_robe', 'silver_rosary'];
      const count = targetIds.filter((id) => hasEquipment(p, id)).length;
      if (count >= 3) {
        winners.push({ playerId: p.id, reason: 'Possesses 3+ sacred Equipment cards' });
      }
    }
    if (
      cid === 'charles' &&
      p.alive &&
      killContext?.isAttackKill &&
      killContext.killerId === p.id &&
      state.deadCount >= 3
    ) {
      winners.push({ playerId: p.id, reason: 'Killed a character with 3+ total dead' });
    }
    if (
      cid === 'bryan' &&
      p.alive &&
      killContext?.isAttackKill &&
      killContext.killerId === p.id
    ) {
      const killed = state.players.find((x) => x.id === killContext.killedId);
      if (killed && killed.character.maxHp >= 13) {
        winners.push({ playerId: p.id, reason: 'Killed a 13+ HP character' });
      }
    }
    if (cid === 'catherine' && alivePlayers.length <= 2 && p.alive) {
      winners.push({ playerId: p.id, reason: 'One of the last 2 characters remaining' });
    }
  }

  if (winners.length === 0) return state;

  // Secondary Neutral wins triggered when another player wins
  const someoneElseWon = (pid: string) => winners.some((w) => w.playerId !== pid);

  for (const p of state.players) {
    if (winners.some((w) => w.playerId === p.id)) continue;
    const cid = p.character.id;
    if (cid === 'allie' && p.alive && someoneElseWon(p.id)) {
      winners.push({ playerId: p.id, reason: 'Survived until another player won' });
    }
    if (cid === 'daniel') {
      if (p.deathOrder === 1) {
        winners.push({ playerId: p.id, reason: 'First character to die' });
      } else if (p.alive && allShadowsDead) {
        winners.push({ playerId: p.id, reason: 'Survived and Hunters won' });
      }
    }
    if (cid === 'catherine' && p.deathOrder === 1) {
      winners.push({ playerId: p.id, reason: 'First character to die' });
    }
    if (cid === 'bryan' && p.alive && p.areaId === 'erstwhile_altar' && someoneElseWon(p.id)) {
      winners.push({ playerId: p.id, reason: 'On Erstwhile Altar when another player won' });
    }
    if (cid === 'agnes' && p.alive) {
      const idx = state.players.findIndex((x) => x.id === p.id);
      const targetIdx =
        p.agnesTarget === 'above'
          ? (idx - 1 + state.players.length) % state.players.length
          : (idx + 1) % state.players.length;
      const linked = state.players[targetIdx];
      if (linked && winners.some((w) => w.playerId === linked.id)) {
        winners.push({
          playerId: p.id,
          reason: `Linked player (${linked.name}) reached their Win Condition`,
        });
      }
    }
  }

  // Reveal all players at game over
  const revealedPlayers = state.players.map((p) => ({ ...p, revealed: true }));
  return {
    ...state,
    phase: 'game_over',
    players: revealedPlayers,
    winners,
    pending: null,
    logs: addLog(
      state.logs,
      state.turnNumber,
      `🏆 GAME OVER! Winners: ${winners
        .map((w) => {
          const pl = state.players.find((x) => x.id === w.playerId);
          return `${pl?.name} (${pl?.character.name})`;
        })
        .join(', ')}`,
      'win'
    ),
  };
}

export function beginTurn(state: GameState): GameState {
  if (state.phase === 'game_over') return state;
  const current = getCurrentPlayer(state);
  if (!current.alive) {
    return advanceTurn(state);
  }

  // Expire Guardian Angel & Ghostly Barrier at start of player's turn
  let nextState: GameState = {
    ...state,
    phase: 'move',
    hasMoved: false,
    hasUsedArea: false,
    hasAttacked: false,
    lastDice: null,
    lastDrawnCard: null,
    players: state.players.map((p) =>
      p.id === current.id
        ? {
            ...p,
            guardianAngelActive: false,
            ghostlyBarrierActive: false,
            abilityUsed: p.character.id === 'ultrasoul' ? false : p.abilityUsed,
          }
        : p
    ),
    logs: addLog(state.logs, state.turnNumber, `--- ${current.name}'s Turn ---`, 'info'),
  };

  // Catherine start-of-turn heal if revealed & not voided
  if (
    current.character.id === 'catherine' &&
    current.revealed &&
    !current.abilityVoided &&
    current.damage > 0
  ) {
    nextState = healPlayer(nextState, current.id, 1, 'Stigmata');
  }

  // Pass & Play privacy gate if multiple humans
  if (state.config.humanCount > 1 && current.isHuman) {
    nextState = {
      ...nextState,
      pending: { type: 'pass_and_play_gate', nextPlayerId: current.id },
    };
  }

  return nextState;
}

export function advanceTurn(state: GameState): GameState {
  if (state.phase === 'game_over') return state;
  const current = getCurrentPlayer(state);

  // Check extra turns (Concealed Knowledge / Wight)
  if (current.alive && current.extraTurns > 0) {
    const nextState: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.id === current.id ? { ...p, extraTurns: p.extraTurns - 1 } : p
      ),
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${current.name} takes an extra turn!`,
        'info'
      ),
    };
    return beginTurn(nextState);
  }

  let nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
  let guard = 0;
  while (!state.players[nextIdx].alive && guard < state.players.length) {
    nextIdx = (nextIdx + 1) % state.players.length;
    guard++;
  }

  const wrapped = nextIdx <= state.currentPlayerIndex;
  const nextState: GameState = {
    ...state,
    currentPlayerIndex: nextIdx,
    turnNumber: wrapped ? state.turnNumber + 1 : state.turnNumber,
  };
  return beginTurn(nextState);
}

export function rollToMove(state: GameState): GameState {
  const current = getCurrentPlayer(state);
  if (state.phase !== 'move' || state.hasMoved) return state;

  const rollDistinct = (): [number, number, AreaId | null] => {
    for (let i = 0; i < 20; i++) {
      const d6 = rollD6();
      const d4 = rollD4();
      const area = getAreaByRollSum(d6 + d4);
      if (area === null || area !== current.areaId) {
        return [d6, d4, area];
      }
    }
    const d6 = rollD6();
    const d4 = rollD4();
    return [d6, d4, null];
  };

  if (hasEquipment(current, 'mystic_compass')) {
    const [a6, a4] = rollDistinct();
    const [b6, b4] = rollDistinct();
    return {
      ...state,
      lastDice: { d6: a6, d4: a4, label: `Mystic Compass: (${a6}+${a4}=${a6 + a4}) or (${b6}+${b4}=${b6 + b4})` },
      pending: {
        type: 'choose_mystic_compass',
        playerId: current.id,
        roll1: [a6, a4],
        roll2: [b6, b4],
      },
    };
  }

  const [d6, d4, targetArea] = rollDistinct();
  const sum = d6 + d4;
  let nextState: GameState = {
    ...state,
    lastDice: { d6, d4, label: `Move Roll: ${d6} + ${d4} = ${sum}` },
  };

  if (targetArea === null) {
    return {
      ...nextState,
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${current.name} rolled 7 (${d6}+${d4})! Choose any Area.`,
        'info'
      ),
      pending: { type: 'choose_area_roll7', playerId: current.id },
    };
  }

  return completeMove(nextState, current.id, targetArea);
}

export function completeMove(state: GameState, playerId: string, areaId: AreaId): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const nextState: GameState = {
    ...state,
    hasMoved: true,
    phase: 'area_action',
    pending: null,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, areaId } : p
    ),
    logs: addLog(
      state.logs,
      state.turnNumber,
      `${player.name} moved to ${AREAS[areaId].name}.`,
      'info'
    ),
  };

  return evaluateWinConditions(nextState);
}

export function triggerAreaAction(state: GameState): GameState {
  const current = getCurrentPlayer(state);
  if (state.phase !== 'area_action' || state.hasUsedArea || !current.areaId) return state;

  const area = current.areaId;
  if (area === 'hermit_cabin') {
    return drawAndStartResolve(state, current.id, 'hermit');
  }
  if (area === 'church') {
    return drawAndStartResolve(state, current.id, 'white');
  }
  if (area === 'cemetery') {
    return drawAndStartResolve(state, current.id, 'black');
  }
  if (area === 'underworld_gate') {
    return {
      ...state,
      pending: { type: 'choose_underworld_deck', playerId: current.id },
    };
  }
  if (area === 'weird_woods') {
    return {
      ...state,
      pending: { type: 'choose_weird_woods_target', playerId: current.id },
    };
  }
  if (area === 'erstwhile_altar') {
    const victims = state.players.filter(
      (p) => p.id !== current.id && p.alive && p.equipment.length > 0
    );
    if (victims.length === 0) {
      return {
        ...state,
        hasUsedArea: true,
        phase: 'attack',
        logs: addLog(
          state.logs,
          state.turnNumber,
          `Erstwhile Altar: No other player has Equipment to steal.`,
          'info'
        ),
      };
    }
    return {
      ...state,
      pending: { type: 'choose_erstwhile_steal', playerId: current.id },
    };
  }
  return state;
}

export function checkAutoEndAttackPhase(state: GameState): GameState {
  if (state.phase === 'game_over' || state.pending) return state;
  const current = getCurrentPlayer(state);
  if (!current.alive) {
    return advanceTurn(state);
  }
  if (state.phase !== 'attack' || state.hasAttacked) return state;
  if (state.turnNumber === 1) {
    const logged: GameState = {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${current.name}: Round 1 không được phép tấn công thường, tự động kết thúc lượt.`,
        'info'
      ),
    };
    return advanceTurn(logged);
  }
  const targets = getAttackRangeTargets(state, current.id);
  if (targets.length === 0) {
    const logged: GameState = {
      ...state,
      logs: addLog(
        state.logs,
        state.turnNumber,
        `${current.name} không có hành động tấn công phù hợp, tự động kết thúc lượt.`,
        'info'
      ),
    };
    return advanceTurn(logged);
  }
  return state;
}

export function enterAttackPhase(state: GameState): GameState {
  if (state.phase === 'game_over' || state.pending) return state;
  return checkAutoEndAttackPhase({ ...state, phase: 'attack' });
}

export function skipAreaAction(state: GameState): GameState {
  return enterAttackPhase({
    ...state,
    hasUsedArea: true,
    pending: null,
  });
}

export function drawAndStartResolve(
  state: GameState,
  playerId: string,
  deckType: DeckType
): GameState {
  if (state.hasUsedArea || state.phase !== 'area_action') return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const clearedState: GameState = { ...state, pending: null };
  const { state: s1, card } = drawCardFromDeck(clearedState, deckType);
  if (!card) {
    return enterAttackPhase({
      ...s1,
      hasUsedArea: true,
      pending: null,
      logs: addLog(s1.logs, s1.turnNumber, `The ${deckType} deck is empty!`, 'card'),
    });
  }

  let nextState: GameState = {
    ...s1,
    hasUsedArea: true,
    pending: null,
    logs: addLog(
      s1.logs,
      s1.turnNumber,
      `${player.name} drew ${card.name} (${card.deck.toUpperCase()} - ${card.kind}).`,
      'card',
      card.deck === 'hermit'
        ? {
            publicText: `${player.name} drew a Hermit card.`,
            visibleTo: [player.id],
          }
        : undefined
    ),
  };

  if (card.kind === 'Equipment') {
    nextState = {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === playerId ? { ...p, equipment: [...p.equipment, card] } : p
      ),
    };
    const checked = evaluateWinConditions(nextState);
    return checked.phase === 'game_over' ? checked : enterAttackPhase(checked);
  }

  // Hermit Card
  if (card.deck === 'hermit') {
    const others = nextState.players.filter((p) => p.id !== playerId && p.alive);
    if (others.length === 0) {
      return { ...discardCard(nextState, card), phase: 'attack' };
    }
    return {
      ...nextState,
      pending: {
        type: 'resolve_card_target',
        playerId,
        card,
        validTargetIds: others.map((p) => p.id),
        mode: 'hermit_give',
      },
    };
  }

  // Single-use White / Black Cards
  nextState = discardCard(nextState, card);
  const others = nextState.players.filter((p) => p.id !== playerId && p.alive);
  const allAlive = nextState.players.filter((p) => p.alive);

  switch (card.id) {
    case 'holy_water':
      nextState = healPlayer(nextState, playerId, 2, 'Holy Water of Healing');
      return { ...nextState, phase: 'attack' };

    case 'concealed_knowledge':
      nextState = {
        ...nextState,
        phase: 'attack',
        players: nextState.players.map((p) =>
          p.id === playerId ? { ...p, extraTurns: p.extraTurns + 1 } : p
        ),
        logs: addLog(
          nextState.logs,
          nextState.turnNumber,
          `${player.name} will take an extra turn after this one!`,
          'card'
        ),
      };
      return nextState;

    case 'guardian_angel':
      return {
        ...nextState,
        phase: 'attack',
        players: nextState.players.map((p) =>
          p.id === playerId ? { ...p, guardianAngelActive: true } : p
        ),
        logs: addLog(
          nextState.logs,
          nextState.turnNumber,
          `${player.name} is protected by Guardian Angel until their next turn!`,
          'card'
        ),
      };

    case 'flare_of_judgement':
      for (const o of others) {
        nextState = applyDamage(nextState, o.id, 2, {
          sourcePlayerId: playerId,
          cardId: card.id,
          reason: 'Flare of Judgement',
        });
      }
      return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };

    case 'advent':
      if (player.character.faction === 'Hunter' && !player.revealed) {
        return {
          ...nextState,
          pending: { type: 'optional_reveal_card', playerId, card },
        };
      }
      nextState = {
        ...nextState,
        logs: addLog(nextState.logs, nextState.turnNumber, `Advent had no effect.`, 'card'),
      };
      return { ...nextState, phase: 'attack' };

    case 'diabolic_ritual':
      if (player.character.faction === 'Shadow' && !player.revealed) {
        return {
          ...nextState,
          pending: { type: 'optional_reveal_card', playerId, card },
        };
      }
      nextState = {
        ...nextState,
        logs: addLog(nextState.logs, nextState.turnNumber, `Diabolic Ritual had no effect.`, 'card'),
      };
      return { ...nextState, phase: 'attack' };

    case 'chocolate': {
      const first = player.character.name[0].toUpperCase();
      if (['A', 'E', 'U'].includes(first) && !player.revealed) {
        return {
          ...nextState,
          pending: { type: 'optional_reveal_card', playerId, card },
        };
      }
      nextState = {
        ...nextState,
        logs: addLog(nextState.logs, nextState.turnNumber, `Chocolate had no effect.`, 'card'),
      };
      return { ...nextState, phase: 'attack' };
    }

    case 'disenchant_mirror': {
      const first = player.character.name[0].toUpperCase();
      if (['V', 'W'].includes(first)) {
        nextState = revealPlayer(nextState, playerId, 'Disenchant Mirror');
      } else {
        nextState = {
          ...nextState,
          logs: addLog(nextState.logs, nextState.turnNumber, `Disenchant Mirror had no effect.`, 'card'),
        };
      }
      return { ...nextState, phase: 'attack' };
    }

    case 'dynamite': {
      const d6 = rollD6();
      const d4 = rollD4();
      const sum = d6 + d4;
      const area = getAreaByRollSum(sum);
      nextState = {
        ...nextState,
        lastDice: { d6, d4, label: `Dynamite Roll: ${d6} + ${d4} = ${sum}` },
      };
      if (!area) {
        nextState = {
          ...nextState,
          logs: addLog(nextState.logs, nextState.turnNumber, `Dynamite rolled 7 — nothing happens!`, 'card'),
        };
      } else {
        nextState = {
          ...nextState,
          logs: addLog(
            nextState.logs,
            nextState.turnNumber,
            `Dynamite explodes at ${AREAS[area].name}!`,
            'card'
          ),
        };
        const victims = nextState.players.filter((p) => p.alive && p.areaId === area);
        for (const v of victims) {
          nextState = applyDamage(nextState, v.id, 3, {
            sourcePlayerId: playerId,
            cardId: 'dynamite',
            reason: 'Dynamite',
          });
        }
      }
      return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
    }

    case 'banana_peel':
      if (player.equipment.length === 0) {
        nextState = applyDamage(nextState, playerId, 1, {
          cardId: 'banana_peel',
          reason: 'Banana Peel (no equipment)',
        });
        return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
      }
      return {
        ...nextState,
        pending: {
          type: 'resolve_card_target',
          playerId,
          card,
          validTargetIds: others.map((p) => p.id),
          mode: 'give_equipment',
        },
      };

    case 'moody_goblin': {
      const equipOwners = others.filter((p) => p.equipment.length > 0);
      if (equipOwners.length === 0) {
        return {
          ...nextState,
          phase: 'attack',
          logs: addLog(nextState.logs, nextState.turnNumber, `Moody Goblin: No equipment to steal.`, 'card'),
        };
      }
      return {
        ...nextState,
        pending: {
          type: 'resolve_card_target',
          playerId,
          card,
          validTargetIds: equipOwners.map((p) => p.id),
          mode: 'steal',
        },
      };
    }

    case 'blessing':
      return {
        ...nextState,
        pending: {
          type: 'resolve_card_target',
          playerId,
          card,
          validTargetIds: others.map((p) => p.id),
          mode: 'heal',
        },
      };

    case 'first_aid':
      return {
        ...nextState,
        pending: {
          type: 'resolve_card_target',
          playerId,
          card,
          validTargetIds: allAlive.map((p) => p.id),
          mode: 'first_aid',
        },
      };

    case 'bloodthirsty_spider':
    case 'spiritual_doll':
    case 'vampire_bat':
      return {
        ...nextState,
        pending: {
          type: 'resolve_card_target',
          playerId,
          card,
          validTargetIds: allAlive.map((p) => p.id),
          mode: 'damage',
        },
      };

    default:
      return { ...nextState, phase: 'attack' };
  }
}

export function resolveOptionalRevealCard(state: GameState, reveal: boolean): GameState {
  const pending = state.pending;
  if (!pending || pending.type !== 'optional_reveal_card') return state;
  const { playerId, card } = pending;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  let nextState: GameState = { ...state, pending: null };
  if (reveal) {
    nextState = revealPlayer(nextState, playerId, card.name);
    nextState = healPlayer(nextState, playerId, player.damage, card.name);
  } else {
    nextState = {
      ...nextState,
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${player.name} chose to stay hidden (${card.name}).`,
        'card'
      ),
    };
  }
  return enterAttackPhase(nextState);
}

export function resolveCardTarget(
  state: GameState,
  targetId: string,
  extraCardUid?: string
): GameState {
  const pending = state.pending;
  if (!pending || pending.type !== 'resolve_card_target') return state;
  const { playerId, card, mode } = pending;
  const player = state.players.find((p) => p.id === playerId);
  const target = state.players.find((p) => p.id === targetId);
  if (!player || !target) return state;

  let nextState: GameState = { ...state, pending: null };

  if (mode === 'hermit_give') {
    nextState = {
      ...nextState,
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${player.name} gave ${card.name} to ${target.name}.`,
        'card',
        {
          publicText: `${player.name} gave a Hermit card to ${target.name}.`,
          visibleTo: [playerId, targetId],
        }
      ),
      pending: {
        type: 'hermit_response',
        fromPlayerId: playerId,
        targetPlayerId: targetId,
        card,
      },
    };
    return nextState;
  }

  if (mode === 'first_aid') {
    nextState = {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === targetId ? { ...p, damage: 7 } : p
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `First Aid set ${target.name}'s damage to 7/${target.character.maxHp}.`,
        'card'
      ),
    };
    return { ...nextState, phase: 'attack' };
  }

  if (mode === 'heal' && card.id === 'blessing') {
    const d6 = rollD6();
    nextState = {
      ...nextState,
      lastDice: { d6, d4: 0, label: `Blessing Roll: ${d6}` },
    };
    nextState = healPlayer(nextState, targetId, d6, 'Blessing');
    return { ...nextState, phase: 'attack' };
  }

  if (mode === 'steal') {
    const stolen = target.equipment[0];
    if (stolen) {
      nextState = transferEquipment(nextState, targetId, playerId, [stolen]);
    }
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  if (mode === 'give_equipment') {
    const given =
      player.equipment.find((e) => e.uid === extraCardUid) || player.equipment[0];
    if (given) {
      nextState = transferEquipment(nextState, playerId, targetId, [given]);
    }
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  if (mode === 'damage') {
    if (card.id === 'bloodthirsty_spider') {
      nextState = applyDamage(nextState, targetId, 2, {
        sourcePlayerId: playerId,
        cardId: card.id,
        reason: 'Bloodthirsty Spider',
      });
      nextState = applyDamage(nextState, playerId, 2, {
        sourcePlayerId: playerId,
        cardId: card.id,
        reason: 'Bloodthirsty Spider',
      });
    } else if (card.id === 'vampire_bat') {
      nextState = applyDamage(nextState, targetId, 2, {
        sourcePlayerId: playerId,
        cardId: card.id,
        reason: 'Vampire Bat',
      });
      nextState = healPlayer(nextState, playerId, 1, 'Vampire Bat');
    } else if (card.id === 'spiritual_doll') {
      const d6 = rollD6();
      nextState = {
        ...nextState,
        lastDice: { d6, d4: 0, label: `Spiritual Doll Roll: ${d6}` },
      };
      if (d6 <= 4) {
        nextState = applyDamage(nextState, targetId, 3, {
          sourcePlayerId: playerId,
          cardId: card.id,
          reason: `Spiritual Doll (rolled ${d6})`,
        });
      } else {
        nextState = applyDamage(nextState, playerId, 3, {
          sourcePlayerId: playerId,
          cardId: card.id,
          reason: `Spiritual Doll backfired (rolled ${d6})`,
        });
      }
    }
  }

  return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
}

export function resolveHermitResponse(
  state: GameState,
  choice: 'apply' | 'give_equipment' | 'take_damage' | 'lie_none'
): GameState {
  const pending = state.pending;
  if (!pending || pending.type !== 'hermit_response') return state;

  const { fromPlayerId, targetPlayerId, card } = pending;
  const fromPlayer = state.players.find((p) => p.id === fromPlayerId);
  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!fromPlayer || !target) return state;

  let nextState: GameState = discardCard({ ...state, pending: null }, card);

  if (choice === 'lie_none') {
    return {
      ...nextState,
      phase: 'attack',
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${target.name} reported: Hermit card had no effect.`,
        'card'
      ),
    };
  }

  const faction = target.character.faction;
  const hp = target.character.maxHp;

  const matches = (): boolean => {
    switch (card.id) {
      case 'aid':
      case 'slap':
        return faction === 'Hunter';
      case 'huddle':
      case 'exorcism':
      case 'spell':
        return faction === 'Shadow';
      case 'nurturance':
        return faction === 'Neutral';
      case 'anger':
        return faction === 'Hunter' || faction === 'Shadow';
      case 'blackmail':
        return faction === 'Hunter' || faction === 'Neutral';
      case 'greed':
        return faction === 'Neutral' || faction === 'Shadow';
      case 'bully':
        return hp <= 11;
      case 'tough_lesson':
        return hp >= 12;
      case 'prediction':
        return true;
      default:
        return false;
    }
  };

  if (!matches()) {
    // AI deduction: if target didn't match, record possible knowledge
    return {
      ...nextState,
      phase: 'attack',
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${target.name} reported: Hermit card had no effect.`,
        'card'
      ),
    };
  }

  const pair = [fromPlayerId, targetPlayerId];

  if (card.id === 'prediction') {
    nextState = {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === fromPlayerId
          ? { ...p, knownIdentities: { ...p.knownIdentities, [targetPlayerId]: faction } }
          : p
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Prediction: ${target.name} secretly showed ${target.character.name} (${faction}) to ${fromPlayer.name}.`,
        'reveal',
        {
          publicText: `${target.name} secretly showed their identity to ${fromPlayer.name}.`,
          visibleTo: pair,
        }
      ),
    };
    return { ...nextState, phase: 'attack' };
  }

  if (['aid', 'huddle', 'nurturance'].includes(card.id)) {
    if (target.damage === 0) {
      nextState = applyDamage(nextState, targetPlayerId, 1, {
        cardId: card.id,
        reason: `${card.name} (no damage to heal)`,
        publicReason: 'Hermit card',
        visibleTo: pair,
      });
    } else {
      nextState = healPlayer(nextState, targetPlayerId, 1, card.name, {
        publicSourceText: 'Hermit card',
        visibleTo: pair,
      });
    }
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  if (['exorcism', 'tough_lesson'].includes(card.id)) {
    nextState = applyDamage(nextState, targetPlayerId, 2, {
      cardId: card.id,
      reason: card.name,
      publicReason: 'Hermit card',
      visibleTo: pair,
    });
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  if (['slap', 'spell', 'bully'].includes(card.id)) {
    nextState = applyDamage(nextState, targetPlayerId, 1, {
      cardId: card.id,
      reason: card.name,
      publicReason: 'Hermit card',
      visibleTo: pair,
    });
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  if (['anger', 'blackmail', 'greed'].includes(card.id)) {
    if (choice === 'give_equipment' && target.equipment.length > 0) {
      nextState = transferEquipment(nextState, targetPlayerId, fromPlayerId, [target.equipment[0]]);
    } else {
      nextState = applyDamage(nextState, targetPlayerId, 1, {
        cardId: card.id,
        reason: card.name,
        publicReason: 'Hermit card',
        visibleTo: pair,
      });
    }
    return nextState.phase === 'game_over' ? nextState : { ...nextState, phase: 'attack' };
  }

  return { ...nextState, phase: 'attack' };
}

export function declareAttack(
  state: GameState,
  attackerId: string,
  targetIds: string[],
  isCounterOrExtra = false
): GameState {
  const attacker = state.players.find((p) => p.id === attackerId);
  if (!attacker || !attacker.alive || targetIds.length === 0) return state;
  if (!isCounterOrExtra && (state.hasAttacked || state.turnNumber === 1)) return state;

  const targetNames = targetIds
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return {
    ...state,
    logs: addLog(
      state.logs,
      state.turnNumber,
      `${attacker.name} targets ${targetNames} for an attack!`,
      'combat'
    ),
    pending: {
      type: 'roll_attack_dice',
      attackerId,
      targetIds,
      isCounterOrExtra,
    },
  };
}

export function performAttack(
  state: GameState,
  attackerId: string,
  targetIds: string[],
  isCounterOrExtra = false
): GameState {
  const attacker = state.players.find((p) => p.id === attackerId);
  if (!attacker || !attacker.alive || targetIds.length === 0) return state;
  if (!isCounterOrExtra && (state.hasAttacked || state.turnNumber === 1)) return state;

  const useD4Only =
    hasEquipment(attacker, 'masamune') ||
    (attacker.character.id === 'valkyrie' && attacker.revealed && !attacker.abilityVoided);

  const d4 = rollD4();
  const d6 = useD4Only ? 0 : rollD6();
  const rawDiff = useD4Only ? d4 : Math.abs(d6 - d4);

  let nextState: GameState = {
    ...state,
    hasAttacked: isCounterOrExtra ? state.hasAttacked : true,
    pending: null,
    lastDice: {
      d6,
      d4,
      label: useD4Only
        ? `Attack (d4): ${d4} base damage`
        : `Attack Roll: |${d6} - ${d4}| = ${rawDiff} base damage`,
    },
  };

  if (rawDiff === 0) {
    nextState = {
      ...nextState,
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `${attacker.name}'s attack missed (rolled ${d6} & ${d4})!`,
        'combat'
      ),
    };
    return postAttackHooks(nextState, attackerId, targetIds[0], 0, isCounterOrExtra);
  }

  // Spear of Longinus prompt if Hunter & unrevealed & human
  if (
    hasEquipment(attacker, 'spear_of_longinus') &&
    attacker.character.faction === 'Hunter' &&
    !attacker.revealed &&
    attacker.isHuman
  ) {
    return {
      ...nextState,
      pending: {
        type: 'spear_reveal_prompt',
        attackerId,
        targets: targetIds.map((id) => ({ id, rawDiff })),
      },
    };
  }

  return finalizeAttackDamage(nextState, attackerId, targetIds, rawDiff, false, isCounterOrExtra);
}

export function finalizeAttackDamage(
  state: GameState,
  attackerId: string,
  targetIds: string[],
  rawDiff: number,
  revealSpear: boolean,
  isCounterOrExtra = false
): GameState {
  let nextState = state;
  let attacker = nextState.players.find((p) => p.id === attackerId)!;

  if (revealSpear) {
    nextState = revealPlayer(nextState, attackerId, 'Spear of Longinus');
    attacker = nextState.players.find((p) => p.id === attackerId)!;
  }

  let bonus = 0;
  if (hasEquipment(attacker, 'butcher_knife')) bonus += 1;
  if (hasEquipment(attacker, 'chainsaw')) bonus += 1;
  if (hasEquipment(attacker, 'rusted_broad_axe')) bonus += 1;
  if (
    hasEquipment(attacker, 'spear_of_longinus') &&
    attacker.character.faction === 'Hunter' &&
    attacker.revealed
  ) {
    bonus += 2;
  }
  if (hasEquipment(attacker, 'holy_robe')) {
    bonus -= 1;
  }

  const totalDamage = Math.max(0, rawDiff + bonus);

  // Base Bob steal instead of damage prompt
  if (
    targetIds.length === 1 &&
    attacker.character.id === 'bob' &&
    attacker.revealed &&
    !attacker.abilityVoided &&
    totalDamage >= 2
  ) {
    const def = nextState.players.find((p) => p.id === targetIds[0]);
    if (def && def.equipment.length > 0 && attacker.isHuman) {
      return {
        ...nextState,
        pending: {
          type: 'bob_steal_or_damage',
          attackerId,
          defenderId: def.id,
          damage: totalDamage,
        },
      };
    }
  }

  for (const tid of targetIds) {
    nextState = applyDamage(nextState, tid, totalDamage, {
      sourcePlayerId: attackerId,
      isAttack: true,
      reason: `Attack by ${attacker.name}`,
    });
  }

  if (nextState.phase === 'game_over') return nextState;

  // Vampire heal 2 on damage
  attacker = nextState.players.find((p) => p.id === attackerId)!;
  if (
    attacker.alive &&
    attacker.character.id === 'vampire' &&
    attacker.revealed &&
    !attacker.abilityVoided &&
    totalDamage > 0
  ) {
    nextState = healPlayer(nextState, attackerId, 2, 'Suck Blood');
  }

  return postAttackHooks(nextState, attackerId, targetIds[0], totalDamage, isCounterOrExtra);
}

function postAttackHooks(
  state: GameState,
  attackerId: string,
  primaryTargetId: string,
  _damageDealt: number,
  isCounterOrExtra: boolean
): GameState {
  if (state.phase === 'game_over' || state.pending) return state;

  const defender = state.players.find((p) => p.id === primaryTargetId);
  const attacker = state.players.find((p) => p.id === attackerId);

  // Werewolf counterattack
  if (
    !isCounterOrExtra &&
    defender &&
    defender.alive &&
    defender.character.id === 'werewolf' &&
    defender.revealed &&
    !defender.abilityVoided &&
    attacker &&
    attacker.alive
  ) {
    if (defender.isHuman) {
      return {
        ...state,
        pending: {
          type: 'werewolf_counter',
          werewolfId: defender.id,
          attackerId: attacker.id,
        },
      };
    } else {
      return performAttack(state, defender.id, [attacker.id], true);
    }
  }

  // Charles extra attack
  if (
    attacker &&
    attacker.alive &&
    attacker.character.id === 'charles' &&
    attacker.revealed &&
    !attacker.abilityVoided &&
    attacker.damage + 2 < attacker.character.maxHp &&
    getAttackRangeTargets(state, attacker.id).length > 0 &&
    attacker.isHuman
  ) {
    return {
      ...state,
      pending: { type: 'charles_extra_attack', playerId: attacker.id },
    };
  }

  return state;
}

export function useSpecialAbility(state: GameState, playerId: string, targetId?: string): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.alive || !player.revealed || player.abilityVoided) {
    return state.pending?.type === 'use_ability_target'
      ? { ...state, pending: null }
      : state;
  }

  let nextState: GameState = { ...state, pending: null };
  const cid = player.character.id;

  if (cid === 'allie' && !player.abilityUsed) {
    nextState = healPlayer(nextState, playerId, player.damage, "Mother's Love");
    return {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === playerId ? { ...p, abilityUsed: true } : p
      ),
    };
  }

  if ((cid === 'franklin' || cid === 'george') && !player.abilityUsed) {
    if (!targetId) {
      const targets = nextState.players.filter((p) => p.id !== playerId && p.alive);
      return {
        ...nextState,
        pending: {
          type: 'use_ability_target',
          playerId,
          abilityId: cid,
          validTargetIds: targets.map((p) => p.id),
        },
      };
    }
    const roll = cid === 'franklin' ? rollD6() : rollD4();
    nextState = {
      ...nextState,
      lastDice: {
        d6: cid === 'franklin' ? roll : 0,
        d4: cid === 'george' ? roll : 0,
        label: `${player.character.abilityName}: rolled ${roll}`,
      },
      players: nextState.players.map((p) =>
        p.id === playerId ? { ...p, abilityUsed: true } : p
      ),
    };
    return applyDamage(nextState, targetId, roll, {
      sourcePlayerId: playerId,
      reason: player.character.abilityName,
    });
  }

  if (cid === 'ellen' && !player.abilityUsed) {
    if (!targetId) {
      const targets = nextState.players.filter((p) => p.id !== playerId && p.alive);
      return {
        ...nextState,
        pending: {
          type: 'use_ability_target',
          playerId,
          abilityId: 'ellen',
          validTargetIds: targets.map((p) => p.id),
        },
      };
    }
    const target = nextState.players.find((p) => p.id === targetId);
    return {
      ...nextState,
      players: nextState.players.map((p) => {
        if (p.id === playerId) return { ...p, abilityUsed: true };
        if (p.id === targetId) return { ...p, abilityVoided: true };
        return p;
      }),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Ellen voided ${target?.name}'s Special Ability for the rest of the game!`,
        'reveal'
      ),
    };
  }

  if (cid === 'fuka' && !player.abilityUsed) {
    if (!targetId) {
      const targets = nextState.players.filter((p) => p.alive);
      return {
        ...nextState,
        pending: {
          type: 'use_ability_target',
          playerId,
          abilityId: 'fuka',
          validTargetIds: targets.map((p) => p.id),
        },
      };
    }
    const target = nextState.players.find((p) => p.id === targetId);
    return {
      ...nextState,
      players: nextState.players.map((p) => {
        if (p.id === playerId) return { ...p, abilityUsed: true };
        if (p.id === targetId) return { ...p, damage: 7 };
        return p;
      }),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Fuka's Dynamite Nurse set ${target?.name}'s damage to 7!`,
        'reveal'
      ),
    };
  }

  if (cid === 'gregor' && !player.abilityUsed) {
    return {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === playerId
          ? { ...p, abilityUsed: true, ghostlyBarrierActive: true }
          : p
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Gregor activated Ghostly Barrier until his next turn!`,
        'reveal'
      ),
    };
  }

  if (cid === 'wight' && !player.abilityUsed && nextState.deadCount > 0) {
    return {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === playerId
          ? { ...p, abilityUsed: true, extraTurns: p.extraTurns + nextState.deadCount }
          : p
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Wight's Multiplication grants ${nextState.deadCount} extra turn(s)!`,
        'reveal'
      ),
    };
  }

  if (cid === 'ultrasoul' && !player.abilityUsed) {
    const victims = nextState.players.filter(
      (p) => p.alive && p.areaId === 'underworld_gate'
    );
    if (victims.length > 0 && !targetId) {
      return {
        ...nextState,
        pending: {
          type: 'use_ability_target',
          playerId,
          abilityId: 'ultrasoul',
          validTargetIds: victims.map((p) => p.id),
        },
      };
    }
    if (targetId) {
      nextState = {
        ...nextState,
        players: nextState.players.map((p) =>
          p.id === playerId ? { ...p, abilityUsed: true } : p
        ),
      };
      return applyDamage(nextState, targetId, 3, {
        sourcePlayerId: playerId,
        reason: 'Murder Ray',
      });
    }
  }

  if (cid === 'david' && !player.abilityUsed) {
    const deadWithEquip = nextState.players.filter(
      (p) => !p.alive && p.equipment.length > 0
    );
    if (deadWithEquip.length > 0 && !targetId) {
      return {
        ...nextState,
        pending: {
          type: 'use_ability_target',
          playerId,
          abilityId: 'david',
          validTargetIds: deadWithEquip.map((p) => p.id),
        },
      };
    }
    if (targetId) {
      const deadP = nextState.players.find((p) => p.id === targetId);
      if (deadP && deadP.equipment.length > 0) {
        nextState = {
          ...nextState,
          players: nextState.players.map((p) =>
            p.id === playerId ? { ...p, abilityUsed: true } : p
          ),
        };
        return transferEquipment(nextState, targetId, playerId, [deadP.equipment[0]]);
      }
    }
  }

  if (cid === 'agnes' && !player.abilityUsed) {
    return {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              abilityUsed: true,
              agnesTarget: p.agnesTarget === 'above' ? 'below' : 'above',
            }
          : p
      ),
      logs: addLog(
        nextState.logs,
        nextState.turnNumber,
        `Agnes switched her Win Condition target to the player below her!`,
        'reveal'
      ),
    };
  }

  return nextState;
}

/** Single-step AI driver so the UI can animate each bot action smoothly */
export function stepAI(state: GameState): GameState {
  return checkAutoEndAttackPhase(stepAIInner(state));
}

function stepAIInner(state: GameState): GameState {
  if (state.phase === 'game_over') return state;

  // Handle pending prompts directed at a bot
  if (state.pending) {
    const p = state.pending;
    if (p.type === 'choose_area_roll7') {
      const areas = AREA_LIST.map((a) => a.id).filter(
        (id) => id !== getCurrentPlayer(state).areaId
      );
      return completeMove(state, p.playerId, areas[Math.floor(Math.random() * areas.length)]);
    }
    if (p.type === 'choose_mystic_compass') {
      const sum = p.roll1[0] + p.roll1[1];
      const area = getAreaByRollSum(sum);
      if (!area) {
        const areas = AREA_LIST.map((a) => a.id).filter(
          (id) => id !== getCurrentPlayer(state).areaId
        );
        return completeMove(state, p.playerId, areas[0]);
      }
      return completeMove(state, p.playerId, area);
    }
    if (p.type === 'choose_underworld_deck') {
      const decks: DeckType[] = ['white', 'black', 'hermit'];
      return drawAndStartResolve(state, p.playerId, decks[Math.floor(Math.random() * 3)]);
    }
    if (p.type === 'choose_weird_woods_target') {
      const actor = state.players.find((x) => x.id === p.playerId)!;
      const enemies = pickEnemiesForAI(state, actor);
      if (enemies.length > 0) {
        const next = applyDamage(state, enemies[0].id, 2, {
          sourcePlayerId: actor.id,
          isWeirdWoods: true,
          reason: 'Weird Woods',
        });
        return next.phase === 'game_over'
          ? next
          : { ...next, hasUsedArea: true, phase: 'attack', pending: null };
      }
      const next = healPlayer(state, actor.id, 1, 'Weird Woods');
      return { ...next, hasUsedArea: true, phase: 'attack', pending: null };
    }
    if (p.type === 'choose_erstwhile_steal') {
      const victims = state.players.filter(
        (x) => x.id !== p.playerId && x.alive && x.equipment.length > 0
      );
      if (victims.length > 0) {
        const v = victims[0];
        const next = transferEquipment(state, v.id, p.playerId, [v.equipment[0]]);
        return next.phase === 'game_over'
          ? next
          : { ...next, hasUsedArea: true, phase: 'attack', pending: null };
      }
      return { ...state, hasUsedArea: true, phase: 'attack', pending: null };
    }
    if (p.type === 'optional_reveal_card') {
      const actor = state.players.find((x) => x.id === p.playerId);
      return resolveOptionalRevealCard(state, Boolean(actor && actor.damage >= 3));
    }
    if (p.type === 'resolve_card_target') {
      const actor = state.players.find((x) => x.id === p.playerId)!;
      const enemies = pickEnemiesForAI(state, actor).filter((e) =>
        p.validTargetIds.includes(e.id)
      );
      const targetId =
        p.mode === 'heal'
          ? p.validTargetIds[0]
          : enemies[0]?.id || p.validTargetIds[0];
      return resolveCardTarget(state, targetId);
    }
    if (p.type === 'hermit_response') {
      const target = state.players.find((x) => x.id === p.targetPlayerId)!;
      if (target.character.id === 'unknown' && !target.revealed && !target.abilityVoided) {
        return resolveHermitResponse(state, 'lie_none');
      }
      if (target.equipment.length > 0 && ['anger', 'blackmail', 'greed'].includes(p.card.id)) {
        return resolveHermitResponse(state, 'take_damage');
      }
      return resolveHermitResponse(state, 'apply');
    }
    if (p.type === 'kill_loot') {
      const victim = state.players.find((x) => x.id === p.victimId);
      if (victim && victim.equipment.length > 0) {
        const next = transferEquipment(state, victim.id, p.killerId, [victim.equipment[0]]);
        return { ...next, pending: null };
      }
      return { ...state, pending: null };
    }
  }

  const current = getCurrentPlayer(state);
  if (current.isHuman) return state;

  // Bot strategic ability usage
  if (!current.abilityUsed && !current.abilityVoided) {
    if (current.character.id === 'allie' && current.damage >= 5) {
      const revealed = current.revealed ? state : revealPlayer(state, current.id);
      return useSpecialAbility(revealed, current.id);
    }
    if (
      (current.character.id === 'franklin' || current.character.id === 'george') &&
      state.turnNumber >= 2
    ) {
      const enemies = pickEnemiesForAI(state, current);
      if (enemies.length > 0) {
        const revealed = current.revealed ? state : revealPlayer(state, current.id);
        return useSpecialAbility(revealed, current.id, enemies[0].id);
      }
    }
  }

  if (state.phase === 'move') {
    return rollToMove(state);
  }
  if (state.phase === 'area_action') {
    return triggerAreaAction(state);
  }
  if (state.phase === 'attack') {
    if (!state.hasAttacked && state.turnNumber > 1) {
      const targets = getAttackRangeTargets(state, current.id);
      if (targets.length > 0) {
        const enemies = pickEnemiesForAI(state, current).filter((e) =>
          targets.some((t) => t.id === e.id)
        );
        const chosen = enemies[0] || (hasEquipment(current, 'masamune') ? targets[0] : null);
        if (chosen) {
          const allIds = hasEquipment(current, 'machine_gun')
            ? targets.map((t) => t.id)
            : [chosen.id];
          return performAttack(state, current.id, allIds);
        }
      }
    }
    return advanceTurn(state);
  }

  return advanceTurn(state);
}

function pickEnemiesForAI(state: GameState, actor: PlayerState): PlayerState[] {
  const others = state.players.filter((p) => p.id !== actor.id && p.alive);
  const myFaction = actor.character.faction;

  return [...others].sort((a, b) => {
    const score = (p: PlayerState): number => {
      const known = actor.knownIdentities[p.id];
      if (myFaction === 'Hunter') {
        if (known === 'Shadow') return 100;
        if (known === 'Hunter') return -100;
        return 10;
      }
      if (myFaction === 'Shadow') {
        if (known === 'Hunter') return 100;
        if (known === 'Neutral') return 60;
        if (known === 'Shadow') return -100;
        return 10;
      }
      return 10;
    };
    return score(b) - score(a);
  });
}

/** Auto-performs a safe default action when a human player's 90s action timer expires */
export function autoActOnTimeout(state: GameState): GameState {
  const next = checkAutoEndAttackPhase(autoActOnTimeoutInner(state));
  const sameState =
    next.turnNumber === state.turnNumber &&
    next.currentPlayerIndex === state.currentPlayerIndex &&
    next.phase === state.phase &&
    next.hasMoved === state.hasMoved &&
    next.hasUsedArea === state.hasUsedArea &&
    next.hasAttacked === state.hasAttacked &&
    (next.pending?.type || 'none') === (state.pending?.type || 'none');

  if (sameState && next.phase !== 'game_over') {
    return advanceTurn({ ...next, pending: null });
  }
  return next;
}

function autoActOnTimeoutInner(state: GameState): GameState {
  if (state.phase === 'game_over') return state;
  const current = getCurrentPlayer(state);

  if (state.pending) {
    const p = state.pending;
    if (p.type === 'pass_and_play_gate') {
      return { ...state, pending: null };
    }
    if (p.type === 'choose_area_roll7') {
      const areas = AREA_LIST.map((a) => a.id).filter((id) => id !== current.areaId);
      return completeMove(state, p.playerId, areas[0]);
    }
    if (p.type === 'choose_mystic_compass') {
      const sum = p.roll1[0] + p.roll1[1];
      const area = getAreaByRollSum(sum);
      if (!area) {
        const areas = AREA_LIST.map((a) => a.id).filter((id) => id !== current.areaId);
        return completeMove(state, p.playerId, areas[0]);
      }
      return completeMove(state, p.playerId, area);
    }
    if (p.type === 'choose_emi_move') {
      return completeMove(state, p.playerId, p.adjacentAreas[0]);
    }
    if (p.type === 'choose_underworld_deck') {
      const decks: DeckType[] = ['white', 'black', 'hermit'];
      return drawAndStartResolve(state, p.playerId, decks[Math.floor(Math.random() * 3)]);
    }
    if (p.type === 'choose_weird_woods_target') {
      const next = healPlayer(state, p.playerId, 1, 'Weird Woods (Auto)');
      return { ...next, hasUsedArea: true, phase: 'attack', pending: null };
    }
    if (p.type === 'choose_erstwhile_steal') {
      return { ...state, hasUsedArea: true, phase: 'attack', pending: null };
    }
    if (p.type === 'optional_reveal_card') {
      const actor = state.players.find((x) => x.id === p.playerId);
      return resolveOptionalRevealCard(state, Boolean(actor && actor.damage >= 3));
    }
    if (p.type === 'resolve_card_target') {
      return resolveCardTarget(state, p.validTargetIds[0]);
    }
    if (p.type === 'hermit_response') {
      const target = state.players.find((x) => x.id === p.targetPlayerId);
      if (target && target.equipment.length > 0 && ['anger', 'blackmail', 'greed'].includes(p.card.id)) {
        return resolveHermitResponse(state, 'take_damage');
      }
      return resolveHermitResponse(state, 'apply');
    }
    if (p.type === 'roll_attack_dice') {
      return performAttack(
        { ...state, pending: null },
        p.attackerId,
        p.targetIds,
        Boolean(p.isCounterOrExtra)
      );
    }
    if (p.type === 'spear_reveal_prompt') {
      return finalizeAttackDamage(
        { ...state, pending: null },
        p.attackerId,
        p.targets.map((t) => t.id),
        p.targets[0].rawDiff,
        false
      );
    }
    if (p.type === 'bob_steal_or_damage') {
      return applyDamage({ ...state, pending: null }, p.defenderId, p.damage, {
        sourcePlayerId: p.attackerId,
        isAttack: true,
        reason: 'Attack by Bob',
      });
    }
    if (p.type === 'charles_extra_attack' || p.type === 'werewolf_counter') {
      return { ...state, pending: null };
    }
    if (p.type === 'kill_loot') {
      const victim = state.players.find((x) => x.id === p.victimId);
      if (victim && victim.equipment.length > 0) {
        return transferEquipment({ ...state, pending: null }, victim.id, p.killerId, [
          victim.equipment[0],
        ]);
      }
      return { ...state, pending: null };
    }
    if (p.type === 'use_ability_target') {
      return useSpecialAbility(state, p.playerId, p.validTargetIds[0]);
    }
  }

  if (state.phase === 'move') {
    return rollToMove(state);
  }
  if (state.phase === 'area_action') {
    return triggerAreaAction(state);
  }
  if (state.phase === 'attack') {
    return advanceTurn(state);
  }

  return advanceTurn(state);
}
