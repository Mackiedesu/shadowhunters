import {
  advanceTurn,
  applyDamage,
  checkAutoEndAttackPhase,
  completeMove,
  drawAndStartResolve,
  finalizeAttackDamage,
  getAdjacentAreas,
  getCurrentPlayer,
  healPlayer,
  performAttack,
  resolveCardTarget,
  resolveHermitResponse,
  revealPlayer,
  rollToMove,
  stepAI,
  transferEquipment,
  triggerAreaAction,
  useSpecialAbility,
} from './gameEngine.ts';
import type { AreaId, DeckType, GameState } from '../types/game.ts';

export type ClientAction =
  | { type: 'roll_move' }
  | { type: 'emi_teleport' }
  | { type: 'area_action' }
  | { type: 'attack_target'; targetIds: string[] }
  | { type: 'end_turn' }
  | { type: 'reveal_self' }
  | { type: 'use_ability'; targetId?: string }
  | { type: 'select_area'; areaId: AreaId }
  | { type: 'select_deck'; deck: DeckType }
  | { type: 'weird_woods'; targetId: string; mode: 'damage' | 'heal' }
  | { type: 'erstwhile_steal'; victimId: string }
  | { type: 'resolve_card_target'; targetId: string; extraCardUid?: string }
  | { type: 'hermit_response'; choice: 'apply' | 'give_equipment' | 'take_damage' | 'lie_none' }
  | { type: 'spear_prompt'; reveal: boolean }
  | { type: 'bob_choice'; steal: boolean }
  | { type: 'charles_extra'; extra: boolean }
  | { type: 'werewolf_counter'; counter: boolean }
  | { type: 'kill_loot'; cardUid: string }
  | { type: 'dismiss_pass_gate' };

export function isBotTurnOrPending(state: GameState): boolean {
  if (state.phase === 'game_over') return false;
  const current = getCurrentPlayer(state);
  const p = state.pending;
  if (p) {
    if (p.type === 'pass_and_play_gate') return false;
    if (p.type === 'hermit_response') {
      return !state.players.find((x) => x.id === p.targetPlayerId)?.isHuman;
    }
    if (p.type === 'werewolf_counter') {
      return !state.players.find((x) => x.id === p.werewolfId)?.isHuman;
    }
    if (p.type === 'kill_loot') {
      return !state.players.find((x) => x.id === p.killerId)?.isHuman;
    }
    return !current.isHuman;
  }
  return !current.isHuman;
}

export function getExpectedHumanActorId(state: GameState): string | null {
  if (state.phase === 'game_over') return null;
  const current = getCurrentPlayer(state);
  const p = state.pending;
  if (p) {
    if (p.type === 'pass_and_play_gate') return p.nextPlayerId;
    if (p.type === 'hermit_response') {
      const t = state.players.find((x) => x.id === p.targetPlayerId);
      return t?.isHuman ? t.id : null;
    }
    if (p.type === 'werewolf_counter') {
      const w = state.players.find((x) => x.id === p.werewolfId);
      return w?.isHuman ? w.id : null;
    }
    if (p.type === 'kill_loot') {
      const k = state.players.find((x) => x.id === p.killerId);
      return k?.isHuman ? k.id : null;
    }
    return current.isHuman ? current.id : null;
  }
  return current.isHuman ? current.id : null;
}

export function applyClientAction(
  state: GameState,
  actorId: string,
  action: ClientAction
): GameState {
  return checkAutoEndAttackPhase(applyClientActionInner(state, actorId, action));
}

function applyClientActionInner(
  state: GameState,
  actorId: string,
  action: ClientAction
): GameState {
  if (state.phase === 'game_over') return state;
  const expectedId = getExpectedHumanActorId(state);
  if (expectedId && expectedId !== actorId) return state;

  const current = getCurrentPlayer(state);

  switch (action.type) {
    case 'roll_move':
      return rollToMove(state);

    case 'emi_teleport': {
      const adj = getAdjacentAreas(state.zones, current.areaId);
      return {
        ...revealPlayer(state, current.id, 'Teleport'),
        pending: { type: 'choose_emi_move', playerId: current.id, adjacentAreas: adj },
      };
    }

    case 'area_action':
      return triggerAreaAction(state);

    case 'attack_target':
      return performAttack(state, current.id, action.targetIds);

    case 'end_turn':
      return advanceTurn(state);

    case 'reveal_self':
      return revealPlayer(state, current.id);

    case 'use_ability':
      return useSpecialAbility(state, current.id, action.targetId);

    case 'select_area':
      return completeMove(state, current.id, action.areaId);

    case 'select_deck':
      return drawAndStartResolve(state, current.id, action.deck);

    case 'weird_woods': {
      const next =
        action.mode === 'damage'
          ? applyDamage(state, action.targetId, 2, {
              sourcePlayerId: current.id,
              isWeirdWoods: true,
              reason: 'Weird Woods',
            })
          : healPlayer(state, action.targetId, 1, 'Weird Woods');
      return next.phase === 'game_over'
        ? next
        : { ...next, hasUsedArea: true, phase: 'attack', pending: null };
    }

    case 'erstwhile_steal': {
      const victim = state.players.find((x) => x.id === action.victimId);
      if (!victim || victim.equipment.length === 0) return state;
      const next = transferEquipment(state, action.victimId, current.id, [
        victim.equipment[0],
      ]);
      return next.phase === 'game_over'
        ? next
        : { ...next, hasUsedArea: true, phase: 'attack', pending: null };
    }

    case 'resolve_card_target':
      return resolveCardTarget(state, action.targetId, action.extraCardUid);

    case 'hermit_response':
      return resolveHermitResponse(state, action.choice);

    case 'spear_prompt': {
      if (!state.pending || state.pending.type !== 'spear_reveal_prompt') return state;
      const { attackerId, targets } = state.pending;
      return finalizeAttackDamage(
        { ...state, pending: null },
        attackerId,
        targets.map((t) => t.id),
        targets[0].rawDiff,
        action.reveal
      );
    }

    case 'bob_choice': {
      if (!state.pending || state.pending.type !== 'bob_steal_or_damage') return state;
      const { attackerId, defenderId, damage } = state.pending;
      const def = state.players.find((x) => x.id === defenderId);
      if (action.steal && def && def.equipment.length > 0) {
        return transferEquipment({ ...state, pending: null }, defenderId, attackerId, [
          def.equipment[0],
        ]);
      }
      return applyDamage({ ...state, pending: null }, defenderId, damage, {
        sourcePlayerId: attackerId,
        isAttack: true,
        reason: 'Attack by Bob',
      });
    }

    case 'charles_extra': {
      if (!state.pending || state.pending.type !== 'charles_extra_attack') return state;
      const pid = state.pending.playerId;
      const cleared = { ...state, pending: null };
      if (!action.extra) return cleared;
      const damaged = applyDamage(cleared, pid, 2, {
        sourcePlayerId: pid,
        reason: 'Charles Bloody Feast',
      });
      return damaged.phase === 'game_over'
        ? damaged
        : { ...damaged, hasAttacked: false };
    }

    case 'werewolf_counter': {
      if (!state.pending || state.pending.type !== 'werewolf_counter') return state;
      const { werewolfId, attackerId } = state.pending;
      const cleared = { ...state, pending: null };
      return action.counter ? performAttack(cleared, werewolfId, [attackerId], true) : cleared;
    }

    case 'kill_loot': {
      if (!state.pending || state.pending.type !== 'kill_loot') return state;
      const { killerId, victimId } = state.pending;
      const victim = state.players.find((x) => x.id === victimId);
      const card = victim?.equipment.find((e) => e.uid === action.cardUid);
      if (!card) return { ...state, pending: null };
      return transferEquipment({ ...state, pending: null }, victimId, killerId, [card]);
    }

    case 'dismiss_pass_gate':
      return { ...state, pending: null };

    default:
      return state;
  }
}

export { stepAI };
