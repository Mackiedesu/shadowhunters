import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Skull, Swords, Ban } from 'lucide-react';
import { getFactionColor } from '../data/cards';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import type { PlayerState } from '../types/game';

interface Props {
  lang: Lang;
  player: PlayerState;
  isCurrentTurn: boolean;
  isPassAndPlay: boolean;
  isOnlineMe?: boolean;
  isOnlineMode?: boolean;
  viewerKnowsFaction?: string;
  onZoomImage: (src: string, alt: string) => void;
}

export const PlayerCard: React.FC<Props> = ({
  lang,
  player,
  isCurrentTurn,
  isPassAndPlay,
  isOnlineMe,
  isOnlineMode,
  viewerKnowsFaction,
  onZoomImage,
}) => {
  const t = TRANSLATIONS[lang];
  const [peeking, setPeeking] = useState(false);
  const showIdentity =
    player.revealed ||
    !player.alive ||
    (isOnlineMode
      ? Boolean(isOnlineMe)
      : (!isPassAndPlay && player.isHuman) || (isPassAndPlay && isCurrentTurn && peeking));

  const hpPct = Math.min(100, Math.round((player.damage / player.character.maxHp) * 100));
  const factionColor = getFactionColor(player.character.faction);

  return (
    <div
      className={`player-card ${isCurrentTurn ? 'active-turn' : ''} ${
        !player.alive ? 'dead-player' : ''
      }`}
    >
      <div className="player-card-top">
        <div className="player-id-row">
          <span className="color-dot" style={{ backgroundColor: player.color }} />
          <span className="player-name">{player.name}</span>
          <span className="role-pill">{player.isHuman ? 'HUMAN' : 'BOT'}</span>
        </div>
        <div className="player-badges">
          {player.guardianAngelActive && (
            <span className="status-icon" title="Guardian Angel (Protected from attacks)">
              <Shield size={14} color="#4fc3f7" />
            </span>
          )}
          {player.ghostlyBarrierActive && (
            <span className="status-icon" title="Ghostly Barrier (Immune to all damage)">
              <Shield size={14} color="#ffd54f" />
            </span>
          )}
          {player.abilityVoided && (
            <span className="status-icon" title="Special Ability Voided by Ellen">
              <Ban size={14} color="#ef5350" />
            </span>
          )}
          {!player.alive && (
            <span className="status-icon" title="Dead">
              <Skull size={15} color="#ef5350" />
            </span>
          )}
        </div>
      </div>

      {/* HP Damage Track */}
      <div className="hp-track">
        <div className="hp-label">
          <span>{t.damage}</span>
          <span>
            {player.damage} / {showIdentity ? player.character.maxHp : '?'}
          </span>
        </div>
        <div className="hp-bar-bg">
          <div
            className="hp-bar-fill"
            style={{
              width: `${showIdentity ? hpPct : Math.min(100, player.damage * 8)}%`,
              backgroundColor: hpPct >= 75 ? '#e53935' : hpPct >= 45 ? '#fb8c00' : '#43a047',
            }}
          />
        </div>
      </div>

      {/* Physical Character Card (Front or Back) */}
      {showIdentity ? (
        <div
          className="char-card-front char-card-compact"
          style={{ borderColor: factionColor }}
        >
          <img
            src={`/assets/characters/${player.character.id}.webp`}
            alt={player.character.name}
            className="char-card-photo"
            title="Click to view full screen"
            onClick={() =>
              onZoomImage(
                `/assets/characters/${player.character.id}.webp`,
                player.character.name
              )
            }
          />
          <div className="char-card-info-side">
            <strong style={{ color: factionColor }}>{player.character.name}</strong>
            <span
              className="faction-badge"
              style={{ borderColor: factionColor, color: factionColor }}
            >
              {player.character.faction} • {player.character.maxHp} HP
            </span>
            <small className="click-zoom-hint">{t.clickToZoom}</small>
          </div>
        </div>
      ) : (
        <div className="char-card-back">
          <div className="char-back-inner">
            <span className="char-back-crest">⚔️</span>
            <span className="char-back-label">
              {viewerKnowsFaction ? `${t.known}: ${viewerKnowsFaction}` : t.secretIdentity}
            </span>
            {isPassAndPlay && isCurrentTurn && player.isHuman && (
              <button
                type="button"
                className="peek-btn"
                onClick={() => setPeeking((v) => !v)}
              >
                {peeking ? <EyeOff size={13} /> : <Eye size={13} />} Peek
              </button>
            )}
          </div>
        </div>
      )}

      {isPassAndPlay && isCurrentTurn && player.isHuman && peeking && (
        <button
          type="button"
          className="peek-btn hide-btn"
          onClick={() => setPeeking(false)}
        >
          <EyeOff size={13} /> Hide Identity
        </button>
      )}

      {/* Equipment */}
      {player.equipment.length > 0 && (
        <div className="equip-list">
          {player.equipment.map((eq, idx) => (
            <span
              key={eq.uid || idx}
              className={`equip-chip ${eq.deck}`}
              title={eq.description}
            >
              <Swords size={11} /> {eq.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
