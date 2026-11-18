import { useEffect, useRef, useState } from 'react';
import { BookOpen, Languages, RotateCcw } from 'lucide-react';
import { ActionPanel } from './components/ActionPanel';
import { CardReferenceModal } from './components/CardReferenceModal';
import { GameBoard } from './components/GameBoard';
import { GameOverModal } from './components/GameOverModal';
import { ImageLightbox } from './components/ImageLightbox';
import { PlayerCard, type RolePrediction } from './components/PlayerCard';
import { SetupScreen, type RoomDetail, type RoomSummary } from './components/SetupScreen';
import { AREA_LIST } from './data/cards';
import { getExpectedHumanActorId, type ClientAction } from './engine/actionHandler';
import { getCurrentPlayer } from './engine/gameEngine';
import { TRANSLATIONS, type Lang } from './i18n/translations';
import { preloadAllCardImages } from './utils/preloadAssets';
import type { AreaId, DeckType, GameState } from './types/game';

export function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sh_lang') : null;
    return saved === 'en' || saved === 'vi' ? saved : 'vi';
  });
  const toggleLang = () => {
    setLang((prev) => {
      const next: Lang = prev === 'vi' ? 'en' : 'vi';
      localStorage.setItem('sh_lang', next);
      return next;
    });
  };
  const t = TRANSLATIONS[lang];
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
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; description?: string } | null>(null);
  const [predictions, setPredictions] = useState<Record<string, RolePrediction>>({});
  const lastShownCardUidRef = useRef<string | null>(null);

  const myPlayerId = yourPlayerIndex !== null ? `p_${yourPlayerIndex}` : null;
  const predStorageKey =
    currentRoom && myPlayerId ? `sh_pred_${currentRoom.code}_${myPlayerId}` : null;

  useEffect(() => {
    if (!predStorageKey) {
      setPredictions({});
      return;
    }
    try {
      const raw = localStorage.getItem(predStorageKey);
      setPredictions(raw ? JSON.parse(raw) : {});
    } catch {
      setPredictions({});
    }
  }, [predStorageKey]);

  const updatePrediction = (targetId: string, pred: RolePrediction | null) => {
    setPredictions((prev) => {
      const next = { ...prev };
      if (!pred) delete next[targetId];
      else next[targetId] = pred;
      if (predStorageKey) {
        try {
          localStorage.setItem(predStorageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
      }
      return next;
    });
  };
  const openZoom = (src: string, alt: string, description?: string) =>
    setLightbox({ src, alt, description });

  // Eagerly preload all 67 WebP card images in the background on app load
  useEffect(() => {
    preloadAllCardImages();
  }, []);

  // WebSocket connection: same-origin in production (Render), port 5174 in Vite dev
  useEffect(() => {
    let sessionId = sessionStorage.getItem('sh_session_id');
    if (!sessionId) {
      sessionId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('sh_session_id', sessionId);
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.PROD
      ? `${proto}//${window.location.host}`
      : `${proto}//${window.location.hostname}:5174`;
    let closed = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (closed || wsRef.current !== ws) return;
        setWsConnected(true);
        setWsError(null);
        ws.send(JSON.stringify({ type: 'identify', sessionId }));
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
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
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (wsRef.current === ws) {
          setWsConnected(false);
          wsRef.current = null;
        }
        if (!closed) {
          setTimeout(connect, 1500);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
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

    setLightbox({ src: `/assets/cards/${card.id}.webp`, alt: card.name, description: card.description });
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
    if (predStorageKey) localStorage.removeItem(predStorageKey);
    setPredictions({});
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
          lang={lang}
          onToggleLang={toggleLang}
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
          <CardReferenceModal lang={lang} onClose={() => setShowRef(false)} onZoomImage={openZoom} />
        )}
        {lightbox && (
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            description={lightbox.description}
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
          <button className="btn-ghost" onClick={toggleLang}>
            <Languages size={16} /> {lang === 'vi' ? 'Tiếng Việt' : 'English'}
          </button>
          <button className="btn-ghost" onClick={() => setShowRef(true)}>
            <BookOpen size={16} /> {t.rulesAndCards}
          </button>
          <button className="btn-ghost" onClick={handleLeaveRoom}>
            <RotateCcw size={16} /> {t.leaveRoom}
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
              const cosA = Math.cos(angle);
              const sinA = Math.sin(angle);
              const leftPct = 50 + 42 * cosA;
              const topPct = 50 + 42 * sinA;
              const dockSide: 'left' | 'right' | 'top' =
                sinA < -0.75 ? 'top' : cosA < -0.05 ? 'left' : 'right';
              return (
                <div
                  key={p.id}
                  className="player-seat-pos"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <PlayerCard
                    lang={lang}
                    player={p}
                    isCurrentTurn={idx === gameState.currentPlayerIndex}
                    isPassAndPlay={false}
                    isOnlineMode={true}
                    isOnlineMe={idx === yourPlayerIndex}
                    viewerKnowsFaction={myPlayer?.knownIdentities[p.id]}
                    prediction={predictions[p.id]}
                    dockSide={dockSide}
                    onChangePrediction={(pred) => updatePrediction(p.id, pred)}
                    onZoomImage={openZoom}
                  />
                </div>
              );
            })}
          </div>

          <div className="inner-board-center">
            <GameBoard
              lang={lang}
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
            lang={lang}
            state={gameState}
            turnTimerSeconds={turnTimerSeconds}
            myPlayerId={myPlayerId}
            onRollMove={() => dispatchAction({ type: 'roll_move' })}
            onEmiTeleport={() => dispatchAction({ type: 'emi_teleport' })}
            onAreaAction={() => dispatchAction({ type: 'area_action' })}
            onAttackTarget={(targetIds) =>
              dispatchAction({ type: 'attack_target', targetIds })
            }
            onDirectRollAttack={(targetIds) =>
              dispatchAction({ type: 'direct_roll_attack', targetIds })
            }
            onRollAttackDice={() => dispatchAction({ type: 'roll_attack_dice' })}
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
        <CardReferenceModal lang={lang} onClose={() => setShowRef(false)} onZoomImage={openZoom} />
      )}
      {gameState.phase === 'game_over' && (
        <GameOverModal lang={lang} state={gameState} onPlayAgain={handleLeaveRoom} />
      )}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          description={lightbox.description}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

export default App;
