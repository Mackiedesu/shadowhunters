import React from 'react';
import { AREAS } from '../data/cards';
import type { Lang } from '../i18n/translations';
import { getAreaDesc } from '../i18n/cardTranslations';
import { getCurrentPlayer } from '../engine/gameEngine';
import type { AreaId, GameState } from '../types/game';

interface Props {
  lang: Lang;
  state: GameState;
  selectableAreas: AreaId[];
  myPlayerId?: string | null;
  highlightedPlayerId?: string | null;
  onSelectArea: (areaId: AreaId) => void;
  onZoomImage: (src: string, alt: string, description?: string) => void;
}

export const GameBoard: React.FC<Props> = ({
  lang,
  state,
  selectableAreas,
  myPlayerId,
  highlightedPlayerId,
  onSelectArea,
  onZoomImage,
}) => {
  const currentPlayer = getCurrentPlayer(state);

  const renderZone = (pair: [AreaId, AreaId], zIdx: number) => (
    <div key={zIdx} className={`board-zone-group zone-group-${zIdx}`}>
      <div className="zone-pair">
        {pair.map((areaId) => {
          const area = AREAS[areaId];
          const playersHere = state.players.filter((p) => p.alive && p.areaId === areaId);
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
                  {playersHere.map((p) => {
                    const canSeeMax = p.revealed || !p.alive || p.id === myPlayerId;
                    const isTurnOwner =
                      state.phase !== 'game_over' && p.id === currentPlayer?.id;
                    return (
                      <span
                        key={p.id}
                        className={`player-token ${
                          highlightedPlayerId === p.id ? 'token-highlighted' : ''
                        } ${isTurnOwner ? 'token-active-turn' : ''}`}
                        style={{ borderColor: p.color }}
                        title={
                          canSeeMax
                            ? `${p.name} (${p.damage}/${p.character.maxHp} dmg)`
                            : `${p.name} (${p.damage} dmg)`
                        }
                      >
                        <span
                          className="player-token-dot"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="player-token-name">{p.name}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="zones-board-center">
      <div className="table-ring-subtle" />
      <div className="zones-top-row">{state.zones[0] && renderZone(state.zones[0], 0)}</div>
      <div className="zones-bottom-row">
        {state.zones[2] && renderZone(state.zones[2], 2)}
        {state.zones[1] && renderZone(state.zones[1], 1)}
      </div>
    </div>
  );
};
