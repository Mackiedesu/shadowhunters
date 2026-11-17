import { useEffect, useRef, useState } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import { ActionPanel } from './components/ActionPanel';
import { CardReferenceModal } from './components/CardReferenceModal';
import { GameBoard } from './components/GameBoard';
import { GameOverModal } from './components/GameOverModal';
import { ImageLightbox } from './components/ImageLightbox';
import { PlayerCard } from './components/PlayerCard';
import { SetupScreen, type RoomDetail, type RoomSummary } from './components/SetupScreen';
import { AREA_LIST } from './data/cards';
import { getExpectedHumanActorId, type ClientAction } from './engine/actionHandler';
import { getCurrentPlayer } from './engine/gameEngine';
import { preloadAllCardImages } from './utils/preloadAssets';
import type { AreaId, DeckType, GameState } from './types/game';

export function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomDetail | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number | null>(null);
  const [yourPlayerIndex, setYourPlayerIndex] = useState<number | null>(null);
  const [yourClientId, setYourClientId] = useState<string | null>(null);

  const [showRef, setShowRef] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const lastShownCardUidRef = useRef<string | null>(null);

  const myPlayerId = yourPlayerIndex !== null ? `p_${yourPlayerIndex}` : null;
  const openZoom = (src: string, alt: string) => setLightbox({ src, alt });

  // Eagerly preload all 67 WebP card images in the background on app load
  useEffect(() => {
    preloadAllCardImages();
  }, []);

  // WebSocket connection: same-origin in production (Render), port 5174 in Vite dev
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.PROD
      ? `${proto}//${window.location.host}`
      : `${proto}//${window.location.hostname}:5174`;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (closed || wsRef.current !== ws) return;
        setWsConnected(true);
        setWsError(null);
      };

      ws.onmessage = (evt) => {
        if (closed || wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'rooms_list') {
            setRooms(msg.rooms || []);
          } else if (msg.type === 'room_state') {
            setCurrentRoom(msg.room);
            setYourPlayerIndex(msg.yourPlayerIndex);
            setYourClientId(msg.yourClientId);
            setGameState(msg.gameState);
            setTurnTimerSeconds(msg.timerSeconds ?? null);
            setWsError(null);
          } else if (msg.type === 'timer_tick') {
            setTurnTimerSeconds(msg.timerSeconds);
          } else if (msg.type === 'left_room') {
            setCurrentRoom(null);
            setGameState(null);
            setTurnTimerSeconds(null);
            setYourPlayerIndex(null);
          } else if (msg.type === 'error') {
            setWsError(msg.message);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setWsConnected(false);
          wsRef.current = null;
        }
        if (!closed) {
          setTimeout(connect, 2000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  const sendWs = (payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  // Auto-show drawn card fullscreen for 2 seconds
  useEffect(() => {
    const card = gameState?.lastDrawnCard;
    if (!card || !card.uid) return;
    if (lastShownCardUidRef.current === card.uid) return;
    lastShownCardUidRef.current = card.uid;

    const current = getCurrentPlayer(gameState);
    if (!current.isHuman && card.deck === 'hermit') return;

    setLightbox({ src: `/assets/cards/${card.id}.webp`, alt: card.name });
    const timer = setTimeout(() => {
      setLightbox((prev) =>
        prev?.src === `/assets/cards/${card.id}.webp` ? null : prev
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [gameState?.lastDrawnCard?.uid]);

  const dispatchAction = (action: ClientAction) => {
    sendWs({ type: 'game_action', action });
  };

  const handleLeaveRoom = () => {
    sendWs({ type: 'leave_room' });
    setCurrentRoom(null);
    setGameState(null);
    setTurnTimerSeconds(null);
    setYourPlayerIndex(null);
  };

  if (!gameState) {
    return (
      <div className="app-shell">
        <SetupScreen
          onOpenReference={() => setShowRef(true)}
          wsConnected={wsConnected}
          wsError={wsError}
          rooms={rooms}
          currentRoom={currentRoom}
          yourClientId={yourClientId}
          onCreateRoom={(roomName, maxPlayers, playerName) =>
            sendWs({ type: 'create_room', roomName, maxPlayers, playerName })
          }
          onJoinRoom={(code, playerName) =>
            sendWs({ type: 'join_room', code, playerName })
          }
          onLeaveRoom={() => sendWs({ type: 'leave_room' })}
          onStartRoomGame={() => sendWs({ type: 'start_room_game' })}
        />
        {showRef && (
          <CardReferenceModal onClose={() => setShowRef(false)} onZoomImage={openZoom} />
        )}
        {lightbox && (
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />
        )}
      </div>
    );
  }

  const current = getCurrentPlayer(gameState);
  const myPlayer = yourPlayerIndex !== null ? gameState.players[yourPlayerIndex] : undefined;
  const canIActNow = getExpectedHumanActorId(gameState) === myPlayerId;

  const selectableAreas: AreaId[] = (() => {
    const p = gameState.pending;
    if (!p || !current.isHuman || !canIActNow) return [];
    if (p.type === 'choose_area_roll7') {
      return AREA_LIST.map((a) => a.id).filter((id) => id !== current.areaId);
    }
    if (p.type === 'choose_emi_move') {
      return p.adjacentAreas;
    }
    return [];
  })();

  const seatOffset = yourPlayerIndex ?? 0;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span>⚔️</span>
          <strong>SHADOW HUNTERS</strong>
          {currentRoom && <span className="room-code-chip">ROOM {currentRoom.code}</span>}
        </div>
        <div className="top-actions">
          <button className="btn-ghost" onClick={() => setShowRef(true)}>
            <BookOpen size={16} /> Rules & Cards
          </button>
          <button className="btn-ghost" onClick={handleLeaveRoom}>
            <RotateCcw size={16} /> Leave Room
          </button>
        </div>
      </header>

      <main className="game-layout-tabletop">
        <section className="tabletop-arena">
          <div className="players-ring">
            {gameState.players.map((p, idx) => {
              const total = gameState.players.length;
              const visualIdx = (idx - seatOffset + total) % total;
              const angle = Math.PI / 2 + (visualIdx / total) * Math.PI * 2;
              const leftPct = 50 + 43.5 * Math.cos(angle);
              const topPct = 50 + 43.5 * Math.sin(angle);
              return (
                <div
                  key={p.id}
                  className="player-seat-pos"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <PlayerCard
                    player={p}
                    isCurrentTurn={idx === gameState.currentPlayerIndex}
                    isPassAndPlay={false}
                    isOnlineMode={true}
                    isOnlineMe={idx === yourPlayerIndex}
                    viewerKnowsFaction={myPlayer?.knownIdentities[p.id]}
                    onZoomImage={openZoom}
                  />
                </div>
              );
            })}
          </div>

          <div className="inner-board-center">
            <GameBoard
              state={gameState}
              selectableAreas={selectableAreas}
              canInteract={canIActNow}
              onSelectArea={(areaId) => dispatchAction({ type: 'select_area', areaId })}
              onDrawDeck={(deck: DeckType) => dispatchAction({ type: 'select_deck', deck })}
              onZoomImage={openZoom}
            />
          </div>
        </section>

        <section className="action-column">
          <ActionPanel
            state={gameState}
            turnTimerSeconds={turnTimerSeconds}
            myPlayerId={myPlayerId}
            onRollMove={() => dispatchAction({ type: 'roll_move' })}
            onEmiTeleport={() => dispatchAction({ type: 'emi_teleport' })}
            onAreaAction={() => dispatchAction({ type: 'area_action' })}
            onAttackTarget={(targetIds) =>
              dispatchAction({ type: 'attack_target', targetIds })
            }
            onEndTurn={() => dispatchAction({ type: 'end_turn' })}
            onRevealSelf={() => dispatchAction({ type: 'reveal_self' })}
            onUseAbility={(targetId) =>
              dispatchAction({ type: 'use_ability', targetId })
            }
            onSelectArea={(areaId) => dispatchAction({ type: 'select_area', areaId })}
            onSelectDeck={(deck: DeckType) =>
              dispatchAction({ type: 'select_deck', deck })
            }
            onWeirdWoods={(targetId, mode) =>
              dispatchAction({ type: 'weird_woods', targetId, mode })
            }
            onErstwhileSteal={(victimId) =>
              dispatchAction({ type: 'erstwhile_steal', victimId })
            }
            onResolveCardTarget={(targetId, extraCardUid) =>
              dispatchAction({ type: 'resolve_card_target', targetId, extraCardUid })
            }
            onHermitResponse={(choice) =>
              dispatchAction({ type: 'hermit_response', choice })
            }
            onSpearPrompt={(reveal) =>
              dispatchAction({ type: 'spear_prompt', reveal })
            }
            onBobChoice={(steal) => dispatchAction({ type: 'bob_choice', steal })}
            onCharlesExtra={(extra) =>
              dispatchAction({ type: 'charles_extra', extra })
            }
            onWerewolfCounter={(counter) =>
              dispatchAction({ type: 'werewolf_counter', counter })
            }
            onKillLoot={(cardUid) => dispatchAction({ type: 'kill_loot', cardUid })}
            onDismissPassGate={() => dispatchAction({ type: 'dismiss_pass_gate' })}
            onZoomImage={openZoom}
          />
        </section>
      </main>

      {showRef && (
        <CardReferenceModal onClose={() => setShowRef(false)} onZoomImage={openZoom} />
      )}
      {gameState.phase === 'game_over' && (
        <GameOverModal state={gameState} onPlayAgain={handleLeaveRoom} />
      )}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

export default App;
