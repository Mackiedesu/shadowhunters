import React from 'react';
import { getCurrentPlayer } from '../engine/gameEngine';
import { TRANSLATIONS, type Lang } from '../i18n/translations';
import type { DeckType, GameState } from '../types/game';
import { DeckBackArt } from './CardArt';

interface Props {
  lang: Lang;
  state: GameState;
  canInteract?: boolean;
  onDrawDeck: (deck: DeckType) => void;
}

export const DeckRail: React.FC<Props> = ({
  lang,
  state,
  canInteract = true,
  onDrawDeck,
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
    { type: 'black', label: lang === 'vi' ? 'Đen' : 'Dark', count: state.blackDeck.length },
    { type: 'white', label: lang === 'vi' ? 'Trắng' : 'White', count: state.whiteDeck.length },
    { type: 'hermit', label: lang === 'vi' ? 'Xanh' : 'Green', count: state.hermitDeck.length },
  ];

  return (
    <aside className="decks-sidebar" aria-label="Card Decks">
      {decks.map((d) => {
        const active = canClickDeck(d.type);
        return (
          <button
            type="button"
            key={d.type}
            disabled={!active}
            onClick={() => active && onDrawDeck(d.type)}
            className={`deck-stack-btn deck-rail-btn ${active ? 'deck-clickable' : ''}`}
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
            <span className="deck-rail-label">
              {d.label} <strong>{d.count}</strong>
            </span>
            {active && <span className="draw-prompt-tag">{t.draw}</span>}
          </button>
        );
      })}
    </aside>
  );
};
