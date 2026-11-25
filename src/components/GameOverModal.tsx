import React from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { getFactionColor } from '../data/cards';
import { translateWinReason } from '../i18n/cardTranslations';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import type { GameState } from '../types/game';

interface Props {
  lang: Lang;
  state: GameState;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<Props> = ({ lang, state, onPlayAgain }) => {
  const t = TRANSLATIONS[lang];
  const winnerIds = new Set(state.winners.map((w) => w.playerId));

  return (
    <div className="modal-backdrop">
      <div className="modal-panel gameover-panel">
        <div className="gameover-hero">
          <Trophy size={44} color="#ffd54f" />
          <h2>{t.gameOver}</h2>
        </div>

        <div className="gameover-body">
          <div className="winners-list">
            {state.winners.map((w) => {
              const p = state.players.find((x) => x.id === w.playerId);
              if (!p) return null;
              return (
                <div key={w.playerId} className="winner-banner">
                  <span className="color-dot" style={{ backgroundColor: p.color }} />
                  <div>
                    <strong>
                      {p.name} — {p.character.name} (
                      <span style={{ color: getFactionColor(p.character.faction) }}>
                        {p.character.faction}
                      </span>
                      )
                      {!p.alive && (
                        <span className="winner-dead-tag">
                          {' '}
                          • 💀 {lang === 'vi' ? 'Đã chết vẫn thắng' : 'Dead & Still Wins'}
                        </span>
                      )}
                    </strong>
                    <small>{translateWinReason(w.reason, lang)}</small>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="final-roster">
            <h4>{t.allIdentitiesRevealed}</h4>
            <div className="roster-grid">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className={`roster-item ${winnerIds.has(p.id) ? 'is-winner' : ''}`}
                >
                  <div className="roster-top">
                    <span>
                      {winnerIds.has(p.id) ? '🏆 ' : ''}
                      {p.name}
                    </span>
                    <span style={{ color: getFactionColor(p.character.faction) }}>
                      {p.character.name} ({p.character.faction})
                    </span>
                  </div>
                  <small>
                    {p.alive ? `${t.survived} (${p.damage}/${p.character.maxHp})` : t.dead} •{' '}
                    {p.equipment.length} {t.equip}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gameover-footer">
          <button type="button" className="btn-primary btn-lg gameover-play-btn" onClick={onPlayAgain}>
            <RotateCcw size={18} /> {t.playAgain}
          </button>
        </div>
      </div>
    </div>
  );
};
