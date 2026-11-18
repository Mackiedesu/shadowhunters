import React from 'react';
import { AREAS } from '../data/cards';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import { getAreaDesc } from '../i18n/cardTranslations';
import { getCurrentPlayer } from '../engine/gameEngine';
import type { AreaId, DeckType, GameState } from '../types/game';
import { DeckBackArt } from './CardArt';

interface Props {
  lang: Lang;
  state: GameState;
  selectableAreas: AreaId[];
  canInteract?: boolean;
  onSelectArea: (areaId: AreaId) => void;
  onDrawDeck: (deck: DeckType) => void;
  onZoomImage: (src: string, alt: string, description?: string) => void;
}

export const GameBoard: React.FC<Props> = ({
  lang,
  state,
  selectableAreas,
  canInteract = true,
  onSelectArea,
  onDrawDeck,
  onZoomImage,
}) => {
  const t = TRANSLATIONS[lang];
  const currentPlayer = getCurrentPlayer(state);

  const canClickDeck = (deck: DeckType): boolean => {
    if (!canInteract || !currentPlayer.isHuman) return false;
    if (state.pending?.type === 'choose_underworld_deck') return true;
    if (state.phase !== 'area_action' || state.hasUsedArea || state.pending) return false;

    const area = currentPlayer.areaId;
    if (area === 'underworld_gate') return true;
    if (area === 'church' && deck === 'white') return true;
    if (area === 'cemetery' && deck === 'black') return true;
    if (area === 'hermit_cabin' && deck === 'hermit') return true;
    return false;
  };

  const decks: { type: DeckType; label: string; count: number }[] = [
    { type: 'black', label: 'Dark', count: state.blackDeck.length },
    { type: 'white', label: 'White', count: state.whiteDeck.length },
    { type: 'hermit', label: 'Green', count: state.hermitDeck.length },
  ];

  return (
    <div className="circular-board-wrapper">
      <div className="circular-table">
        {/* Decorative outer ring */}
        <div className="table-ring" />

        {/* 3 Zones arranged around the circle */}
        {state.zones.map((pair, zIdx) => (
          <div key={zIdx} className={`circle-zone zone-pos-${zIdx}`}>
            <div className="zone-badge">{t.zone} {zIdx + 1}</div>
            <div className="zone-pair">
              {pair.map((areaId) => {
                const area = AREAS[areaId];
                const playersHere = state.players.filter(
                  (p) => p.alive && p.areaId === areaId
                );
                const isSelectable = selectableAreas.includes(areaId);
                const isCurrentHere = currentPlayer?.areaId === areaId;

                return (
                  <button
                    type="button"
                    key={areaId}
                    onClick={() =>
                      isSelectable
                        ? onSelectArea(areaId)
                        : onZoomImage(
                            `/assets/areas/${areaId}.webp`,
                            area.name,
                            getAreaDesc(areaId, area.description, lang)
                          )
                    }
                    className={`area-card-visual area-photo-card ${
                      isSelectable ? 'selectable' : 'zoomable'
                    } ${isCurrentHere ? 'current-area' : ''}`}
                    style={{
                      borderColor: isSelectable ? '#ffd54f' : area.color,
                    }}
                    title={
                      isSelectable
                        ? `Click to move to ${area.name}`
                        : `Click to view ${area.name} full screen`
                    }
                  >
                    <img
                      src={`/assets/areas/${areaId}.webp`}
                      alt={area.name}
                      className="area-card-photo"
                    />
                    {playersHere.length > 0 && (
                      <div className="area-tokens-overlay">
                        {playersHere.map((p) => (
                          <span
                            key={p.id}
                            className="player-token"
                            style={{ backgroundColor: p.color }}
                            title={`${p.name} (${p.damage}/${p.character.maxHp} dmg)`}
                          >
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Center 3 Decks */}
        <div className="center-decks-hub">
          {decks.map((d) => {
            const active = canClickDeck(d.type);
            return (
              <button
                type="button"
                key={d.type}
                disabled={!active}
                onClick={() => active && onDrawDeck(d.type)}
                className={`deck-stack-btn ${active ? 'deck-clickable' : ''}`}
                title={
                  active
                    ? `Click to draw from ${d.label} Deck`
                    : `${d.label} Deck (${d.count} cards)`
                }
              >
                <div className="deck-stack-cards">
                  <div className="deck-layer layer-2" />
                  <div className="deck-layer layer-1" />
                  <div className="deck-top">
                    <DeckBackArt deck={d.type} />
                  </div>
                </div>
                <span className="deck-count-pill">{d.count}</span>
                {active && <span className="draw-prompt-tag">{t.draw}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
