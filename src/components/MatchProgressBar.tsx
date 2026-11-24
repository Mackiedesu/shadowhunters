import React from 'react';
import { Skull, Users } from 'lucide-react';
import { FACTION_DISTRIBUTION, getFactionColor } from '../data/cards';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import type { Faction, GameState } from '../types/game';

interface Props {
  lang: Lang;
  state: GameState;
}

const FACTION_META: { faction: Faction; short: string }[] = [
  { faction: 'Hunter', short: 'H' },
  { faction: 'Shadow', short: 'S' },
  { faction: 'Neutral', short: 'N' },
];

export const MatchProgressBar: React.FC<Props> = ({ lang, state }) => {
  const t = TRANSLATIONS[lang];
  const totalPlayers = state.players.length;
  const aliveCount = state.players.filter((p) => p.alive).length;
  const deadCount = totalPlayers - aliveCount;
  const dist = FACTION_DISTRIBUTION[totalPlayers] || { Hunter: 2, Shadow: 2, Neutral: 0 };

  return (
    <div className="match-progress-bar" aria-label={t.matchProgress}>
      <span className="hud-chip hud-round">
        {t.roundLabel} <strong>{state.turnNumber}</strong>
      </span>

      <span className="hud-chip hud-survival" title={`${aliveCount}/${totalPlayers} ${t.aliveLabel}`}>
        <Users size={13} />
        <strong>
          {aliveCount}/{totalPlayers}
        </strong>
        {deadCount > 0 && (
          <span className={`hud-dead-badge ${deadCount >= 2 ? 'urgent' : ''}`}>
            <Skull size={12} /> {deadCount}
          </span>
        )}
      </span>

      <div className="hud-faction-tracker" title={t.factionTrackerHint}>
        {FACTION_META.map(({ faction, short }) => {
          const expected = dist[faction] || 0;
          if (expected === 0) return null;
          const color = getFactionColor(faction);
          const deadList = state.players.filter(
            (p) => !p.alive && p.character.faction === faction
          );
          const revealedAlive = state.players.filter(
            (p) => p.alive && p.revealed && p.character.faction === faction
          );
          const hiddenCount = Math.max(0, expected - deadList.length - revealedAlive.length);

          return (
            <div key={faction} className="hud-faction-group">
              <span className="hud-faction-letter" style={{ color }}>
                {short}
              </span>
              <div className="hud-pips">
                {revealedAlive.map((p) => (
                  <span
                    key={p.id}
                    className="hud-pip pip-revealed"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                    title={`${p.name} — ${p.character.name} (${faction})`}
                  />
                ))}
                {Array.from({ length: hiddenCount }).map((_, idx) => (
                  <span
                    key={`h_${idx}`}
                    className="hud-pip pip-hidden"
                    style={{ borderColor: color }}
                    title={`${faction} (${t.hiddenIdentity})`}
                  />
                ))}
                {deadList.map((p) => (
                  <span
                    key={p.id}
                    className="hud-pip pip-dead"
                    title={`💀 ${p.name} — ${p.character.name} (${faction})`}
                  >
                    ×
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
