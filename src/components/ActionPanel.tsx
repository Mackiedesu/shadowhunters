import React, { useState } from 'react';
import {
  Dices,
  Sparkles,
  Swords,
  Eye,
  SkipForward,
  Zap,
  Heart,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  AREAS,
  AREA_LIST,
  BLACK_CARD_TEMPLATES,
  HERMIT_CARD_TEMPLATES,
  WHITE_CARD_TEMPLATES,
  type CardTemplate,
} from '../data/cards';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import {
  getAreaDesc,
  getCardDesc,
  translateLogText,
} from '../i18n/cardTranslations';
import {
  doesHermitCardMatch,
  getAttackRangeTargets,
  getCurrentPlayer,
  hasEquipment,
} from '../engine/gameEngine';
import type { AreaId, DeckType, GameState } from '../types/game';

const ALL_CARDS_BY_NAME: CardTemplate[] = [
  ...BLACK_CARD_TEMPLATES,
  ...WHITE_CARD_TEMPLATES,
  ...HERMIT_CARD_TEMPLATES,
].sort((a, b) => b.name.length - a.name.length);

const CARD_BY_LOWER = new Map<string, CardTemplate>(
  ALL_CARDS_BY_NAME.map((c) => [c.name.toLowerCase(), c])
);

const CARD_NAME_REGEX = new RegExp(
  `(${ALL_CARDS_BY_NAME.map((c) =>
    c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})(?![A-Za-z0-9])`,
  'gi'
);

function renderLogText(
  text: string,
  lang: Lang,
  onSelectCard: (card: CardTemplate) => void
): React.ReactNode {
  const translated = translateLogText(text, lang);
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  CARD_NAME_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CARD_NAME_REGEX.exec(translated)) !== null) {
    const start = m.index;
    const prevChar = start > 0 ? translated[start - 1] : ' ';
    if (/[A-Za-z0-9]/.test(prevChar)) continue;
    const card = CARD_BY_LOWER.get(m[0].toLowerCase());
    if (!card) continue;
    if (start > lastIdx) parts.push(translated.slice(lastIdx, start));
    parts.push(
      <button
        type="button"
        key={`${start}_${card.id}`}
        className={`log-card-link ${card.deck}`}
        onClick={() => onSelectCard(card)}
        title={getCardDesc(card.id, card.description, lang)}
      >
        {m[0]}
      </button>
    );
    lastIdx = start + m[0].length;
  }
  if (lastIdx < translated.length) parts.push(translated.slice(lastIdx));
  return parts.length > 0 ? parts : translated;
}

interface Props {
  lang: Lang;
  state: GameState;
  turnTimerSeconds: number | null;
  myPlayerId?: string | null;
  onRollMove: () => void;
  onEmiTeleport: () => void;
  onAreaAction: () => void;
  onAttackTarget: (targetIds: string[]) => void;
  onDirectRollAttack: (targetIds: string[]) => void;
  onRollAttackDice: () => void;
  onEndTurn: () => void;
  onRevealSelf: () => void;
  onUseAbility: (targetId?: string) => void;
  onSelectArea: (areaId: AreaId) => void;
  onSelectDeck: (deck: DeckType) => void;
  onWeirdWoods: (targetId: string, mode: 'damage' | 'heal') => void;
  onErstwhileSteal: (victimId: string, cardUid?: string) => void;
  onResolveCardTarget: (targetId: string, extraCardUid?: string) => void;
  onHermitResponse: (choice: 'apply' | 'give_equipment' | 'take_damage' | 'lie_none', cardUid?: string) => void;
  onOptionalRevealCard: (reveal: boolean) => void;
  onSpearPrompt: (reveal: boolean) => void;
  onBobChoice: (steal: boolean, cardUid?: string) => void;
  onCharlesExtra: (extra: boolean) => void;
  onWerewolfCounter: (counter: boolean) => void;
  onKillLoot: (cardUid: string) => void;
  onDismissPassGate: () => void;
  onZoomImage: (src: string, alt: string, description?: string) => void;
}

export const ActionPanel: React.FC<Props> = ({
  lang,
  state,
  turnTimerSeconds,
  myPlayerId,
  onRollMove,
  onEmiTeleport,
  onAreaAction,
  onDirectRollAttack,
  onRollAttackDice,
  onEndTurn,
  onRevealSelf,
  onUseAbility,
  onSelectArea,
  onSelectDeck,
  onWeirdWoods,
  onErstwhileSteal,
  onResolveCardTarget,
  onHermitResponse,
  onOptionalRevealCard,
  onSpearPrompt,
  onBobChoice,
  onCharlesExtra,
  onWerewolfCounter,
  onKillLoot,
  onDismissPassGate,
  onZoomImage,
}) => {
  const t = TRANSLATIONS[lang];
  const current = getCurrentPlayer(state);
  const pending = state.pending;
  const attackTargets =
    state.turnNumber === 1 ? [] : getAttackRangeTargets(state, current.id);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'combat' | 'cards'>('all');
  const effectiveTargetId =
    attackTargets.some((x) => x.id === selectedTargetId)
      ? selectedTargetId
      : attackTargets[0]?.id || '';
  const useD4OnlyForCurrent =
    hasEquipment(current, 'masamune') ||
    (current.character.id === 'valkyrie' && current.revealed && !current.abilityVoided);
  const mustAttack =
    hasEquipment(current, 'masamune') && !state.hasAttacked && attackTargets.length > 0;

  const isPendingForHuman = (() => {
    if (!pending) return false;
    if (pending.type === 'pass_and_play_gate') return true;
    if (pending.type === 'hermit_response') {
      const t = state.players.find((x) => x.id === pending.targetPlayerId);
      return Boolean(t?.isHuman && (!myPlayerId || t.id === myPlayerId));
    }
    if (pending.type === 'werewolf_counter') {
      const w = state.players.find((x) => x.id === pending.werewolfId);
      return Boolean(w?.isHuman && (!myPlayerId || w.id === myPlayerId));
    }
    if (pending.type === 'kill_loot') {
      const k = state.players.find((x) => x.id === pending.killerId);
      return Boolean(k?.isHuman && (!myPlayerId || k.id === myPlayerId));
    }
    if (pending.type === 'roll_attack_dice') {
      const a = state.players.find((x) => x.id === pending.attackerId);
      return Boolean(a?.isHuman && (!myPlayerId || a.id === myPlayerId));
    }
    return current.isHuman && (!myPlayerId || current.id === myPlayerId);
  })();

  const isMyTurn = current.isHuman && (!myPlayerId || current.id === myPlayerId);
  const isOutOfTurnPrompt = isPendingForHuman && !isMyTurn;
  const needsMyAction = state.phase !== 'game_over' && (isPendingForHuman || (!state.pending && isMyTurn));

  const filteredLogs = state.logs.filter((entry) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'combat') {
      return entry.tone === 'combat' || entry.tone === 'heal' || entry.tone === 'death';
    }
    return entry.tone === 'card' || entry.tone === 'reveal';
  });

  const canUseAbilityNow = (() => {
    if (!current.isHuman || !current.alive || !current.revealed || current.abilityVoided) return false;
    const cid = current.character.id;
    if (cid === 'allie' && !current.abilityUsed && current.damage > 0) return true;
    if ((cid === 'franklin' || cid === 'george') && !current.abilityUsed) return true;
    if (cid === 'ellen' && !current.abilityUsed && state.phase === 'move') return true;
    if (cid === 'fuka' && !current.abilityUsed && state.phase === 'move') return true;
    if (cid === 'gregor' && !current.abilityUsed && state.phase === 'attack') return true;
    if (cid === 'wight' && !current.abilityUsed && state.deadCount > 0 && state.phase === 'attack') return true;
    if (cid === 'agnes' && !current.abilityUsed && state.phase === 'move') return true;
    if (
      cid === 'ultrasoul' &&
      state.phase === 'move' &&
      state.players.some((p) => p.alive && p.areaId === 'underworld_gate')
    )
      return true;
    if (
      cid === 'david' &&
      !current.abilityUsed &&
      state.players.some((p) => !p.alive && p.equipment.length > 0)
    )
      return true;
    return false;
  })();

  return (
    <div className={`action-panel ${needsMyAction ? 'is-my-action' : ''}`}>
      {needsMyAction && (
        <div className={`action-alert-banner ${isOutOfTurnPrompt ? 'is-urgent' : ''}`}>
          <Zap size={14} />
          <span>{isOutOfTurnPrompt ? t.actionRequiredAlert : t.yourTurnAlert}</span>
        </div>
      )}

      {/* Turn Header */}
      <div className="turn-banner">
        <div>
          <span className="turn-count">{t.turn} {state.turnNumber}</span>
          <h3 style={{ color: current.color }}>{current.name}{t.turnOf}</h3>
        </div>
        {turnTimerSeconds !== null && (
          <span
            className={`timer-pill ${turnTimerSeconds <= 10 ? 'timer-urgent' : ''}`}
            title={t.timerTooltip}
          >
            ⏱ {turnTimerSeconds}s
          </span>
        )}
        <div className="phase-pills">
          <span className={state.phase === 'move' ? 'active' : ''}>{t.phaseMove}</span>
          <span className={state.phase === 'area_action' ? 'active' : ''}>{t.phaseArea}</span>
          <span className={state.phase === 'attack' ? 'active' : ''}>{t.phaseAttack}</span>
        </div>
      </div>

      {state.lastDrawnCard &&
        state.hasDrawnCardThisTurn &&
        (current.isHuman ||
          state.lastDrawnCard.deck !== 'hermit' ||
          state.pending?.type === 'hermit_response') && (
        <div className={`drawn-card-banner ${state.lastDrawnCard.deck}`}>
          <img
            src={`/assets/cards/${state.lastDrawnCard.id}.webp`}
            alt={state.lastDrawnCard.name}
            className="drawn-card-thumb"
            title="Click to view full screen"
            onClick={() =>
              onZoomImage(
                `/assets/cards/${state.lastDrawnCard!.id}.webp`,
                state.lastDrawnCard!.name,
                getCardDesc(state.lastDrawnCard!.id, state.lastDrawnCard!.description, lang)
              )
            }
          />
          <div className="drawn-card-meta">
            <strong>{state.lastDrawnCard.name}</strong>
            <span>{getCardDesc(state.lastDrawnCard.id, state.lastDrawnCard.description, lang)}</span>
          </div>
        </div>
      )}

      {/* Interactive Controls */}
      <div className="controls-box">
        {isPendingForHuman ? (
          <PendingControls
            lang={lang}
            state={state}
            onRollAttackDice={onRollAttackDice}
            onSelectArea={onSelectArea}
            onSelectDeck={onSelectDeck}
            onWeirdWoods={onWeirdWoods}
            onErstwhileSteal={onErstwhileSteal}
            onResolveCardTarget={onResolveCardTarget}
            onHermitResponse={onHermitResponse}
            onOptionalRevealCard={onOptionalRevealCard}
            onSpearPrompt={onSpearPrompt}
            onBobChoice={onBobChoice}
            onCharlesExtra={onCharlesExtra}
            onWerewolfCounter={onWerewolfCounter}
            onKillLoot={onKillLoot}
            onUseAbility={onUseAbility}
            onDismissPassGate={onDismissPassGate}
          />
        ) : pending ? (
          <div className="bot-thinking">
            <span className="pulse-dot" />
            <span>{t.waitingForResponse}</span>
          </div>
        ) : !isMyTurn ? (
          <div className="bot-thinking">
            <span className="pulse-dot" />
            <span>
              {current.name} {current.isHuman ? '' : '(AI) '}{t.takingTurn}
            </span>
          </div>
        ) : (
          <>
            {state.phase === 'move' && (
              <div className="btn-stack">
                <button className="btn-primary" onClick={onRollMove}>
                  <Dices size={18} /> {t.rollMove}
                </button>
                {current.character.id === 'emi' &&
                  current.revealed &&
                  !current.abilityVoided &&
                  current.areaId && (
                  <button className="btn-secondary" onClick={onEmiTeleport}>
                    <Zap size={16} /> {t.emiTeleport}
                  </button>
                )}
              </div>
            )}

            {state.phase === 'area_action' && current.areaId && (
              <div className="btn-stack">
                <p className="hint-text">
                  {t.youAreAt} <strong>{AREAS[current.areaId].name}</strong>:{' '}
                  {getAreaDesc(current.areaId, AREAS[current.areaId].description, lang)}
                </p>
                <button className="btn-primary" onClick={onAreaAction}>
                  <Sparkles size={16} /> {t.useAreaMandatory}
                </button>
              </div>
            )}

            {state.phase === 'attack' && (
              <div className="btn-stack">
                {state.hasAttacked ? (
                  <p className="hint-text">{t.alreadyAttacked}</p>
                ) : attackTargets.length > 0 ? (
                  <>
                    <p className="hint-text">
                      {hasEquipment(current, 'machine_gun')
                        ? t.machineGunHint
                        : mustAttack
                        ? t.masamuneHint
                        : t.chooseAttackHint}
                    </p>
                    {hasEquipment(current, 'machine_gun') ? (
                      <button
                        className="btn-danger"
                        onClick={() => onDirectRollAttack(attackTargets.map((x) => x.id))}
                      >
                        <Dices size={18} /> {t.attackAll} ({attackTargets.length} {t.targets})
                      </button>
                    ) : (
                      <>
                        <div className="target-list">
                          {attackTargets.map((target) => {
                            const isSelected = target.id === effectiveTargetId;
                            return (
                              <button
                                type="button"
                                key={target.id}
                                className={isSelected ? 'btn-accent' : 'btn-secondary'}
                                onClick={() => setSelectedTargetId(target.id)}
                              >
                                <Swords size={15} /> {t.selectTargetLabel} {target.name} ({target.damage}/
                                {target.revealed ? target.character.maxHp : '?'} dmg)
                              </button>
                            );
                          })}
                        </div>
                        {effectiveTargetId && (
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => onDirectRollAttack([effectiveTargetId])}
                          >
                            <Dices size={18} />{' '}
                            {useD4OnlyForCurrent ? t.rollAttackD4 : t.rollAttackDice}
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="hint-text">{t.noRangeTargets}</p>
                )}

                {!mustAttack && (
                  <button className="btn-secondary" onClick={onEndTurn}>
                    <SkipForward size={16} /> {t.endTurn}
                  </button>
                )}
              </div>
            )}

            {/* Utility Row: Reveal & Special Ability */}
            <div className="utility-row">
              {!current.revealed && (
                <button className="btn-ghost" onClick={onRevealSelf}>
                  <Eye size={15} /> {t.revealIdentity}
                </button>
              )}
              {canUseAbilityNow && (
                <button
                  className="btn-accent"
                  onClick={() => onUseAbility()}
                  title={current.character.abilityName}
                >
                  <Zap size={15} /> {t.specialMove}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Game Log */}
      <div className={`game-log ${logCollapsed ? 'is-collapsed' : ''}`}>
        <div className="game-log-header">
          <h4>{t.battleLog}</h4>
          <button
            type="button"
            className="log-toggle-btn"
            onClick={() => setLogCollapsed((v) => !v)}
          >
            {logCollapsed ? (
              <>
                <ChevronDown size={14} /> {t.expandLog} ({state.logs.length})
              </>
            ) : (
              <>
                <ChevronUp size={14} /> {t.collapseLog}
              </>
            )}
          </button>
        </div>
        {!logCollapsed && (
          <div className="log-filter-row" role="tablist" aria-label={t.battleLog}>
            <button
              type="button"
              role="tab"
              aria-selected={logFilter === 'all'}
              className={`log-filter-chip ${logFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLogFilter('all')}
            >
              {t.logFilterAll}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={logFilter === 'combat'}
              className={`log-filter-chip ${logFilter === 'combat' ? 'active' : ''}`}
              onClick={() => setLogFilter('combat')}
            >
              {t.logFilterCombat}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={logFilter === 'cards'}
              className={`log-filter-chip ${logFilter === 'cards' ? 'active' : ''}`}
              onClick={() => setLogFilter('cards')}
            >
              {t.logFilterCards}
            </button>
          </div>
        )}
        <div className="log-entries">
          {(logCollapsed ? state.logs.slice(0, 1) : filteredLogs).length === 0 ? (
            <div className="log-empty-hint">{t.noMatchingLogs}</div>
          ) : (
            (logCollapsed ? state.logs.slice(0, 1) : filteredLogs).map((entry) => (
              <div
                key={entry.id}
                className={`log-item log-${entry.tone} ${logCollapsed ? 'log-latest-animate' : ''}`}
              >
                <span className="log-turn">[T{entry.turn}]</span>{' '}
                {renderLogText(entry.text, lang, (card) =>
                  onZoomImage(
                    `/assets/cards/${card.id}.webp`,
                    card.name,
                    getCardDesc(card.id, card.description, lang)
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const PendingControls: React.FC<{
  lang: Lang;
  state: GameState;
  onRollAttackDice: () => void;
  onSelectArea: (areaId: AreaId) => void;
  onSelectDeck: (deck: DeckType) => void;
  onWeirdWoods: (targetId: string, mode: 'damage' | 'heal') => void;
  onErstwhileSteal: (victimId: string, cardUid?: string) => void;
  onResolveCardTarget: (targetId: string, extraCardUid?: string) => void;
  onHermitResponse: (choice: 'apply' | 'give_equipment' | 'take_damage' | 'lie_none', cardUid?: string) => void;
  onOptionalRevealCard: (reveal: boolean) => void;
  onSpearPrompt: (reveal: boolean) => void;
  onBobChoice: (steal: boolean, cardUid?: string) => void;
  onCharlesExtra: (extra: boolean) => void;
  onWerewolfCounter: (counter: boolean) => void;
  onKillLoot: (cardUid: string) => void;
  onUseAbility: (targetId?: string) => void;
  onDismissPassGate: () => void;
}> = ({
  lang,
  state,
  onRollAttackDice,
  onSelectArea,
  onSelectDeck,
  onWeirdWoods,
  onErstwhileSteal,
  onResolveCardTarget,
  onHermitResponse,
  onOptionalRevealCard,
  onSpearPrompt,
  onBobChoice,
  onCharlesExtra,
  onWerewolfCounter,
  onKillLoot,
  onUseAbility,
  onDismissPassGate,
}) => {
  const t = TRANSLATIONS[lang];
  const p = state.pending!;

  if (p.type === 'pass_and_play_gate') {
    const nextP = state.players.find((x) => x.id === p.nextPlayerId)!;
    return (
      <div className="pending-box">
        <p className="hint-text">
          Pass the device to <strong style={{ color: nextP.color }}>{nextP.name}</strong>.
        </p>
        <button className="btn-primary" onClick={onDismissPassGate}>
          Ready — Start {nextP.name}'s Turn
        </button>
      </div>
    );
  }

  if (p.type === 'roll_attack_dice') {
    const attacker = state.players.find((x) => x.id === p.attackerId)!;
    const targetNames = p.targetIds
      .map((id) => state.players.find((x) => x.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    const useD4Only =
      hasEquipment(attacker, 'masamune') ||
      (attacker.character.id === 'valkyrie' && attacker.revealed && !attacker.abilityVoided);
    return (
      <div className="pending-box">
        <p className="hint-text">
          {t.attackingTarget}: <strong>{targetNames}</strong>
        </p>
        <button className="btn-danger" onClick={onRollAttackDice}>
          <Dices size={18} /> {useD4Only ? t.rollAttackD4 : t.rollAttackDice}
        </button>
      </div>
    );
  }

  if (p.type === 'choose_area_roll7') {
    const current = getCurrentPlayer(state);
    const validAreas = AREA_LIST.filter((a) => a.id !== current.areaId);
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.roll7Hint}</strong>
        </p>
        <div className="target-list">
          {validAreas.map((a) => (
            <button
              key={a.id}
              className="btn-primary"
              onClick={() => onSelectArea(a.id)}
            >
              ({a.numbers.join('/')}) {a.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (p.type === 'choose_emi_move') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.emiMoveHint}</strong>
        </p>
        <div className="target-list">
          {p.adjacentAreas.map((areaId) => {
            const a = AREAS[areaId];
            return (
              <button
                key={areaId}
                className="btn-primary"
                onClick={() => onSelectArea(areaId)}
              >
                ({a.numbers.join('/')}) {a.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (p.type === 'choose_mystic_compass') {
    const current = getCurrentPlayer(state);
    const s1 = p.roll1[0] + p.roll1[1];
    const s2 = p.roll2[0] + p.roll2[1];
    const a1 = Object.values(AREAS).find((a) => a.numbers.includes(s1));
    const a2 = Object.values(AREAS).find((a) => a.numbers.includes(s2));
    const hasRoll7 = !a1 || !a2;
    const validAreas = AREA_LIST.filter((a) => a.id !== current.areaId);
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.mysticCompassHint}</strong>
        </p>
        {(a1 || a2) && (
          <div className="btn-row">
            {a1 && (
              <button className="btn-primary" onClick={() => onSelectArea(a1.id)}>
                {p.roll1[0]}+{p.roll1[1]}={s1} ({a1.name})
              </button>
            )}
            {a2 && a2.id !== a1?.id && (
              <button className="btn-primary" onClick={() => onSelectArea(a2.id)}>
                {p.roll2[0]}+{p.roll2[1]}={s2} ({a2.name})
              </button>
            )}
          </div>
        )}
        {hasRoll7 && (
          <div className="target-list">
            <p className="hint-text">
              <strong>{t.roll7Hint}</strong>
            </p>
            {validAreas.map((a) => (
              <button
                key={a.id}
                className="btn-secondary"
                onClick={() => onSelectArea(a.id)}
              >
                ({a.numbers.join('/')}) {a.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (p.type === 'choose_underworld_deck') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.underworldHint}</strong>
        </p>
        <div className="btn-row">
          <button className="btn-secondary" onClick={() => onSelectDeck('white')}>
            White ({state.whiteDeck.length})
          </button>
          <button className="btn-secondary" onClick={() => onSelectDeck('black')}>
            Black ({state.blackDeck.length})
          </button>
          <button className="btn-secondary" onClick={() => onSelectDeck('hermit')}>
            Hermit ({state.hermitDeck.length})
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'choose_weird_woods_target') {
    const alive = state.players.filter((x) => x.alive);
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.weirdWoodsHint}</strong>
        </p>
        <div className="target-list">
          {alive.map((target) => (
            <div key={target.id} className="dual-target-row">
              <span>{target.name} ({target.damage} dmg)</span>
              <div>
                <button className="btn-danger btn-sm" onClick={() => onWeirdWoods(target.id, 'damage')}>
                  {t.weirdWoodsDamageBtn}
                </button>
                <button className="btn-heal btn-sm" onClick={() => onWeirdWoods(target.id, 'heal')}>
                  <Heart size={12} /> {t.weirdWoodsHealBtn}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (p.type === 'choose_erstwhile_steal') {
    const victims = state.players.filter(
      (x) => x.id !== p.playerId && x.alive && x.equipment.length > 0
    );
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.erstwhileHint}</strong>
        </p>
        <div className="target-list">
          {victims.flatMap((v) =>
            v.equipment.map((eq, idx) => (
              <button
                key={`${v.id}_${eq.uid || idx}`}
                className="btn-secondary"
                onClick={() => onErstwhileSteal(v.id, eq.uid)}
              >
                {t.stealFrom} {eq.name} {t.from} {v.name}
              </button>
            ))
          )}
          <button className="btn-ghost" onClick={() => onErstwhileSteal('')}>
            {t.doNotSteal}
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'resolve_card_target') {
    const targets = state.players.filter((x) => p.validTargetIds.includes(x.id));
    const actor = state.players.find((x) => x.id === p.playerId);
    const useGrid =
      p.mode !== 'steal' &&
      !(p.mode === 'give_equipment' && actor && actor.equipment.length > 1);
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{p.card.name}:</strong> {getCardDesc(p.card.id, p.card.description, lang)}
        </p>
        <div className={`target-list ${useGrid ? 'target-grid' : ''}`}>
          {p.mode === 'steal'
            ? targets.flatMap((target) =>
                target.equipment.map((eq, idx) => (
                  <button
                    key={`${target.id}_${eq.uid || idx}`}
                    className="btn-primary"
                    onClick={() => onResolveCardTarget(target.id, eq.uid)}
                  >
                    {t.stealFrom} {eq.name} {t.from} {target.name}
                  </button>
                ))
              )
            : p.mode === 'give_equipment' && actor && actor.equipment.length > 1
            ? actor.equipment.flatMap((eq, idx) =>
                targets.map((target) => (
                  <button
                    key={`${eq.uid || idx}_${target.id}`}
                    className="btn-primary"
                    onClick={() => onResolveCardTarget(target.id, eq.uid)}
                  >
                    {eq.name} → {target.name}
                  </button>
                ))
              )
            : targets.map((target) => (
                <button
                  key={target.id}
                  className="btn-primary"
                  onClick={() => onResolveCardTarget(target.id)}
                >
                  {target.name} ({target.damage} dmg)
                </button>
              ))}
        </div>
      </div>
    );
  }

  if (p.type === 'hermit_response') {
    const target = state.players.find((x) => x.id === p.targetPlayerId)!;
    const matchesTarget = doesHermitCardMatch(p.card.id, target);
    const isUnknownDeceit =
      target.character.id === 'unknown' && !target.revealed && !target.abilityVoided;
    const isEquipChoice = ['anger', 'blackmail', 'greed'].includes(p.card.id);
    const canExecute = matchesTarget || isUnknownDeceit;
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.hermitFor} {target.name}:</strong> {p.card.name} —{' '}
          {getCardDesc(p.card.id, p.card.description, lang)}
        </p>
        <div className="btn-row">
          {!canExecute ? (
            <button className="btn-secondary" onClick={() => onHermitResponse('apply')}>
              {t.hermitNoEffectBtn}
            </button>
          ) : isEquipChoice && target.equipment.length > 0 ? (
            <>
              {target.equipment.map((eq, idx) => (
                <button
                  key={eq.uid || idx}
                  className="btn-secondary"
                  onClick={() => onHermitResponse('give_equipment', eq.uid)}
                >
                  {target.equipment.length > 1 ? `${t.giveEquip}: ${eq.name}` : t.giveEquip}
                </button>
              ))}
              <button className="btn-danger" onClick={() => onHermitResponse('take_damage')}>
                {t.take1Dmg}
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => onHermitResponse('apply')}>
              {isUnknownDeceit ? t.unknownExecute : t.resolveHonestly}
            </button>
          )}
          {isUnknownDeceit && (
            <button className="btn-accent" onClick={() => onHermitResponse('lie_none')}>
              {t.unknownLie}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (p.type === 'optional_reveal_card') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{p.card.name}:</strong> {getCardDesc(p.card.id, p.card.description, lang)}
        </p>
        <div className="btn-row">
          <button className="btn-primary" onClick={() => onOptionalRevealCard(true)}>
            {t.revealAndHeal}
          </button>
          <button className="btn-secondary" onClick={() => onOptionalRevealCard(false)}>
            {t.stayHidden}
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'spear_reveal_prompt') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.spearHint}</strong>
        </p>
        <div className="btn-row">
          <button className="btn-primary" onClick={() => onSpearPrompt(true)}>
            {t.spearReveal}
          </button>
          <button className="btn-secondary" onClick={() => onSpearPrompt(false)}>
            {t.stayHidden}
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'bob_steal_or_damage') {
    const defender = state.players.find((x) => x.id === p.defenderId);
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.bobHint} {p.damage}?</strong>
        </p>
        <div className="btn-row">
          {defender && defender.equipment.length > 1 ? (
            defender.equipment.map((eq, idx) => (
              <button
                key={eq.uid || idx}
                className="btn-accent"
                onClick={() => onBobChoice(true, eq.uid)}
              >
                {t.stealFrom} {eq.name}
              </button>
            ))
          ) : (
            <button
              className="btn-accent"
              onClick={() => onBobChoice(true, defender?.equipment[0]?.uid)}
            >
              {defender?.equipment[0] ? `${t.stealFrom} ${defender.equipment[0].name}` : t.bobSteal}
            </button>
          )}
          <button className="btn-danger" onClick={() => onBobChoice(false)}>
            {t.dealDmg} ({p.damage})
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'charles_extra_attack') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.charlesHint}</strong>
        </p>
        <div className="btn-row">
          <button className="btn-danger" onClick={() => onCharlesExtra(true)}>
            {t.charlesYes}
          </button>
          <button className="btn-secondary" onClick={() => onCharlesExtra(false)}>
            {t.noThanks}
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'werewolf_counter') {
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.werewolfHint}</strong>
        </p>
        <div className="btn-row">
          <button className="btn-danger" onClick={() => onWerewolfCounter(true)}>
            <ShieldAlert size={15} /> {t.counterattack}
          </button>
          <button className="btn-secondary" onClick={() => onWerewolfCounter(false)}>
            {t.skip}
          </button>
        </div>
      </div>
    );
  }

  if (p.type === 'kill_loot') {
    const victim = state.players.find((x) => x.id === p.victimId)!;
    return (
      <div className="pending-box">
        <p className="hint-text">
          <strong>{t.killLootHint} {victim.name}:</strong>
        </p>
        <div className="target-list">
          {victim.equipment.map((eq) => (
            <button key={eq.uid} className="btn-accent" onClick={() => onKillLoot(eq.uid!)}>
              {t.take} {eq.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (p.type === 'use_ability_target') {
    const targets = state.players.filter((x) => p.validTargetIds.includes(x.id));
    return (
      <div className="pending-box">
        <p className="hint-text">{t.abilityTargetHint}</p>
        <div className="target-list target-grid">
          {targets.map((t) => (
            <button key={t.id} className="btn-accent" onClick={() => onUseAbility(t.id)}>
              {t.name} ({t.damage} dmg)
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
