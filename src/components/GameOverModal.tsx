import React from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { getFactionColor } from '../data/cards';
import type { GameState } from '../types/game';

interface Props {
  state: GameState;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<Props> = ({ state, onPlayAgain }) => {
  const winnerIds = new Set(state.winners.map((w) => w.playerId));

  return (
    <div className="modal-backdrop">
      <div className="modal-panel gameover-panel">
        <div className="gameover-hero">
          <Trophy size={44} color="#ffd54f" />
          <h2>GAME OVER</h2>
        </div>

        <div className="winners-list">
          {state.winners.map((w) => {
            const p = state.players.find((x) => x.id === w.playerId)!;
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
                  </strong>
                  <small>{w.reason}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="final-roster">
          <h4>All Identities Revealed</h4>
          <div className="roster-grid">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={`roster-item ${winnerIds.has(p.id) ? 'is-winner' : ''}`}
              >
                <div className="roster-top">
                  <span>{p.name}</span>
                  <span style={{ color: getFactionColor(p.character.faction) }}>
                    {p.character.name} ({p.character.faction})
                  </span>
                </div>
                <small>
                  {p.alive ? `Survived (${p.damage}/${p.character.maxHp} dmg)` : 'Dead'} •{' '}
                  {p.equipment.length} Equip
                </small>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary btn-lg" onClick={onPlayAgain}>
          <RotateCcw size={18} /> Play Again
        </button>
      </div>
    </div>
  );
};
