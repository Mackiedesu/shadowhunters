import React from 'react';
import { Play, Skull } from 'lucide-react';
import { getFactionColor } from '../data/cards';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import type { GameState } from '../types/game';
import type { RolePrediction } from './PlayerCard';

interface Props {
  lang: Lang;
  state: GameState;
  myPlayerId: string | null;
  predictions: Record<string, RolePrediction>;
  highlightedPlayerId: string | null;
  onHighlightPlayer: (playerId: string | null, persist?: boolean) => void;
}

export const TurnOrderStrip: React.FC<Props> = ({
  lang,
  state,
  myPlayerId,
  predictions,
  highlightedPlayerId,
  onHighlightPlayer,
}) => {
  const t = TRANSLATIONS[lang];
  const total = state.players.length;

  // Find next alive player index after currentPlayerIndex
  let nextAliveIdx = -1;
  for (let step = 1; step < total; step++) {
    const idx = (state.currentPlayerIndex + step) % total;
    if (state.players[idx]?.alive) {
      nextAliveIdx = idx;
      break;
    }
  }

  return (
    <div className="turn-order-strip" role="list" aria-label={t.turnOrderLabel}>
      <span className="turn-order-title">{t.turnOrderLabel}</span>
      <div className="turn-order-list">
        {state.players.map((p, idx) => {
          const isCurrent = idx === state.currentPlayerIndex && state.phase !== 'game_over';
          const isNext = idx === nextAliveIdx && state.phase !== 'game_over';
          const isMe = p.id === myPlayerId;
          const showMaxHp = p.revealed || !p.alive || isMe;
          const revealedFaction = p.revealed || !p.alive ? p.character.faction : null;
          const predFaction = !revealedFaction && !isMe ? predictions[p.id]?.faction : null;

          return (
            <button
              type="button"
              key={p.id}
              role="listitem"
              className={`turn-chip ${isCurrent ? 'is-current' : ''} ${
                !p.alive ? 'is-dead' : ''
              } ${isMe ? 'is-me' : ''} ${highlightedPlayerId === p.id ? 'is-highlighted' : ''}`}
              onClick={() => onHighlightPlayer(p.id, true)}
              onMouseEnter={() => onHighlightPlayer(p.id, false)}
              onMouseLeave={() => onHighlightPlayer(null, false)}
              title={
                showMaxHp
                  ? `${p.name} — ${p.character.name} (${p.damage}/${p.character.maxHp})`
                  : `${p.name} (${p.damage} dmg)`
              }
            >
              {isCurrent && <Play size={10} className="turn-chip-arrow" fill="currentColor" />}
              <span className="turn-chip-dot" style={{ backgroundColor: p.color }} />
              <span className="turn-chip-name">{p.name}</span>
              {!p.alive ? (
                <Skull size={11} className="turn-chip-skull" />
              ) : (
                <span className="turn-chip-hp">
                  {showMaxHp ? `${p.damage}/${p.character.maxHp}` : `${p.damage}`}
                </span>
              )}
              {revealedFaction && (
                <span
                  className="turn-chip-faction"
                  style={{
                    color: getFactionColor(revealedFaction),
                    borderColor: getFactionColor(revealedFaction),
                  }}
                >
                  {revealedFaction[0]}
                </span>
              )}
              {!revealedFaction && predFaction && (
                <span
                  className="turn-chip-faction is-guess"
                  style={{
                    color: getFactionColor(predFaction),
                    borderColor: getFactionColor(predFaction),
                  }}
                >
                  ?{predFaction[0]}
                </span>
              )}
              {p.extraTurns > 0 && p.alive && (
                <span className="turn-chip-extra">+{p.extraTurns}</span>
              )}
              {isNext && !isCurrent && <span className="turn-chip-next">{t.nextLabel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
