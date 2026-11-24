import { useEffect, useRef, useState } from 'react';
import { soundManager } from './audio/soundManager';
import { useGameSfx } from './audio/useGameSfx';
import { ActionPanel } from './components/ActionPanel';
import { CardReferenceModal } from './components/CardReferenceModal';
import { DeckRail } from './components/DeckRail';
import { EventToastOverlay } from './components/EventToastOverlay';
import { GameBoard } from './components/GameBoard';
import { GameOverModal } from './components/GameOverModal';
import { ImageLightbox } from './components/ImageLightbox';
import { MatchProgressBar } from './components/MatchProgressBar';
import { OptionsMenu } from './components/OptionsMenu';
import { PlayerCard, type RolePrediction } from './components/PlayerCard';
import { SetupScreen, type RoomDetail, type RoomSummary } from './components/SetupScreen';
import { TurnOrderStrip } from './components/TurnOrderStrip';
import { useFitScale } from './hooks/useFitScale';
import { AREA_LIST } from './data/cards';
import { getExpectedHumanActorId, type ClientAction } from './engine/actionHandler';
import { getCurrentPlayer } from './engine/gameEngine';
import type { Lang } from './i18n/translations';
import { getCardDesc } from './i18n/cardTranslations';
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
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    subtitle?: string;
    description?: string;
    autoCloseMs?: number;
    autoCloseKey?: string;
  } | null>(null);
  const [predictions, setPredictions] = useState<Record<string, RolePrediction>>({});
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const tabletopStageRef = useRef<HTMLDivElement | null>(null);
  const lastShownCardUidRef = useRef<string | null>(null);
  const lastShownHermitKeyRef = useRef<string | null>(null);
  const lightboxTimerRef = useRef<number | null>(null);

  const [bgmMuted, setBgmMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sh_bgm_muted') === 'true';
  });
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => soundManager.isMuted());
  const lobbyBgmRef = useRef<HTMLAudioElement | null>(null);
  const ingameBgmRef = useRef<HTMLAudioElement | null>(null);

  const toggleBgm = () => {
    setBgmMuted((prev) => {
      const next = !prev;
      localStorage.setItem('sh_bgm_muted', String(next));
      return next;
    });
  };

  const toggleSfx = () => {
    setSfxMuted((prev) => {
      const next = !prev;
      soundManager.setMuted(next);
      return next;
    });
  };

  useEffect(() => {
    const lobbyAudio = new Audio('/assets/lobby-bgm.mp3');
    lobbyAudio.loop = true;
    lobbyAudio.volume = 0.35;
    lobbyBgmRef.current = lobbyAudio;

    const ingameAudio = new Audio('/assets/ingame-bgm.mp3');
    ingameAudio.loop = true;
    ingameAudio.volume = 0.35;
    ingameBgmRef.current = ingameAudio;

    const unregisterDuck = soundManager.registerBgmDucking((ducked) => {
      const targetVol = ducked ? 0.14 : 0.35;
      lobbyAudio.volume = targetVol;
      ingameAudio.volume = targetVol;
    });

    return () => {
      unregisterDuck();
      lobbyAudio.pause();
      lobbyAudio.src = '';
      lobbyBgmRef.current = null;
      ingameAudio.pause();
      ingameAudio.src = '';
      ingameBgmRef.current = null;
    };
  }, []);

  const inGame = Boolean(gameState);
  const fitScale = useFitScale(tabletopStageRef, 1060, 840, inGame);

  const handleHighlightPlayer = (playerId: string | null, persist = false) => {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedPlayerId(playerId);
    if (playerId && persist) {
      highlightTimerRef.current = window.setTimeout(() => {
        highlightTimerRef.current = null;
        setHighlightedPlayerId((prev) => (prev === playerId ? null : prev));
      }, 1700);
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const lobbyAudio = lobbyBgmRef.current;
    const ingameAudio = ingameBgmRef.current;
    if (!lobbyAudio || !ingameAudio) return;

    if (bgmMuted) {
      lobbyAudio.pause();
      ingameAudio.pause();
      return;
    }

    const activeAudio = inGame ? ingameAudio : lobbyAudio;
    const inactiveAudio = inGame ? lobbyAudio : ingameAudio;
    inactiveAudio.pause();

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      activeAudio.play().catch(() => {
        // Browser blocked autoplay until first user gesture
      });
    };

    tryPlay();

    const unlock = () => {
      tryPlay();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [inGame, bgmMuted]);

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
  const clearLightboxTimer = () => {
    if (lightboxTimerRef.current !== null) {
      window.clearTimeout(lightboxTimerRef.current);
      lightboxTimerRef.current = null;
    }
  };

  const closeLightbox = () => {
    clearLightboxTimer();
    setLightbox(null);
  };

  const openZoom = (src: string, alt: string, description?: string) => {
    clearLightboxTimer();
    soundManager.play('ui_card_zoom');
    setLightbox({ src, alt, description });
  };

  useEffect(() => {
    return () => clearLightboxTimer();
  }, []);

  const canIActNow = gameState ? getExpectedHumanActorId(gameState) === myPlayerId : false;

  useGameSfx({
    currentRoom,
    gameState,
    myPlayerId,
    canIActNow,
    turnTimerSeconds,
  });

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

  // Auto-show drawn deck card or received Hermit card on screen for 5 seconds
  useEffect(() => {
    if (!gameState) {
      lastShownCardUidRef.current = null;
      lastShownHermitKeyRef.current = null;
      return;
    }

    const showAutoCard = (
      key: string,
      src: string,
      alt: string,
      description: string,
      subtitle?: string
    ) => {
      clearLightboxTimer();
      const AUTO_CLOSE_MS = 5000;
      setLightbox({
        src,
        alt,
        subtitle,
        description,
        autoCloseMs: AUTO_CLOSE_MS,
        autoCloseKey: key,
      });
      lightboxTimerRef.current = window.setTimeout(() => {
        lightboxTimerRef.current = null;
        setLightbox((prev) => (prev?.autoCloseKey === key ? null : prev));
      }, AUTO_CLOSE_MS);
    };

    // Case 1: Received a Hermit card from another player (human or bot)
    if (
      gameState.pending?.type === 'hermit_response' &&
      myPlayerId &&
      gameState.pending.targetPlayerId === myPlayerId
    ) {
      const p = gameState.pending;
      const hermitKey = `hermit:${p.card.uid || p.card.id}:${gameState.lastDrawnSeq ?? gameState.turnNumber}:${p.fromPlayerId}`;
      if (lastShownHermitKeyRef.current !== hermitKey) {
        lastShownHermitKeyRef.current = hermitKey;
        if (gameState.lastDrawnCard) {
          lastShownCardUidRef.current = `draw:${gameState.lastDrawnSeq ?? 0}:${gameState.lastDrawnCard.uid || gameState.lastDrawnCard.id}`;
        }
        const senderName =
          gameState.players.find((x) => x.id === p.fromPlayerId)?.name || '';
        const subtitle = senderName
          ? lang === 'vi'
            ? `Nhận thẻ Hermit từ ${senderName}`
            : `Hermit card from ${senderName}`
          : lang === 'vi'
          ? 'Nhận thẻ Hermit'
          : 'Received Hermit card';
        showAutoCard(
          hermitKey,
          `/assets/cards/${p.card.id}.webp`,
          p.card.name,
          getCardDesc(p.card.id, p.card.description, lang),
          subtitle
        );
      }
      return;
    }

    // Case 2: Card drawn from White / Black / Hermit deck (sanitized per-player by server)
    const card = gameState.lastDrawnCard;
    if (!card) return;
    const drawKey = `draw:${gameState.lastDrawnSeq ?? 0}:${card.uid || card.id}`;
    if (lastShownCardUidRef.current === drawKey) return;
    lastShownCardUidRef.current = drawKey;

    const drawer = gameState.players.find((x) => x.id === gameState.lastDrawnByPlayerId);
    const subtitle = drawer
      ? lang === 'vi'
        ? `${drawer.name} đã rút bài`
        : `${drawer.name} drew a card`
      : undefined;

    showAutoCard(
      drawKey,
      `/assets/cards/${card.id}.webp`,
      card.name,
      getCardDesc(card.id, card.description, lang),
      subtitle
    );
  }, [
    gameState?.lastDrawnSeq,
    gameState?.lastDrawnCard?.uid,
    gameState?.pending?.type,
    gameState?.pending && 'targetPlayerId' in gameState.pending
      ? gameState.pending.targetPlayerId
      : null,
    myPlayerId,
    lang,
  ]);

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
          bgmMuted={bgmMuted}
          onToggleBgm={toggleBgm}
          sfxMuted={sfxMuted}
          onToggleSfx={toggleSfx}
          onOpenReference={() => setShowRef(true)}
          wsConnected={wsConnected}
          wsError={wsError}
          rooms={rooms}
          currentRoom={currentRoom}
          yourClientId={yourClientId}
          onCreateRoom={(roomName, maxPlayers) =>
            sendWs({ type: 'create_room', roomName, maxPlayers })
          }
          onJoinRoom={(code) =>
            sendWs({ type: 'join_room', code })
          }
          onRenamePlayer={(name) =>
            sendWs({ type: 'rename_player', name })
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
            subtitle={lightbox.subtitle}
            description={lightbox.description}
            autoCloseMs={lightbox.autoCloseMs}
            autoCloseKey={lightbox.autoCloseKey}
            lang={lang}
            onClose={closeLightbox}
          />
        )}
      </div>
    );
  }

  const current = getCurrentPlayer(gameState);
  const myPlayer = yourPlayerIndex !== null ? gameState.players[yourPlayerIndex] : undefined;

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
    <div className={`app-shell in-game ${canIActNow ? 'my-turn-shell' : ''}`}>
      <header className="top-bar top-bar-compact">
        <div className="brand">
          <span>⚔️</span>
          <strong>SHADOW HUNTERS</strong>
          {currentRoom && <span className="room-code-chip">{currentRoom.code}</span>}
        </div>
        <div className="top-bar-center">
          <MatchProgressBar lang={lang} state={gameState} />
        </div>
        <div className="top-actions">
          <OptionsMenu
            lang={lang}
            onToggleLang={toggleLang}
            bgmMuted={bgmMuted}
            onToggleBgm={toggleBgm}
            sfxMuted={sfxMuted}
            onToggleSfx={toggleSfx}
            onOpenReference={() => setShowRef(true)}
            onLeaveRoom={handleLeaveRoom}
            compact
          />
        </div>
      </header>

      <div className="match-subbar">
        <div className="match-subbar-mobile-hud">
          <MatchProgressBar lang={lang} state={gameState} />
        </div>
        <TurnOrderStrip
          lang={lang}
          state={gameState}
          myPlayerId={myPlayerId}
          predictions={predictions}
          highlightedPlayerId={highlightedPlayerId}
          onHighlightPlayer={handleHighlightPlayer}
        />
      </div>

      <main className="game-layout-tabletop">
        <DeckRail
          lang={lang}
          state={gameState}
          canInteract={canIActNow}
          onDrawDeck={(deck: DeckType) => dispatchAction({ type: 'select_deck', deck })}
        />

        <div className="tabletop-stage" ref={tabletopStageRef}>
          <EventToastOverlay lang={lang} logs={gameState.logs} />
          <section
            className={`tabletop-arena ${fitScale.active ? 'is-scaled' : ''}`}
            style={
              fitScale.active
                ? { transform: `scale(${fitScale.scale})` }
                : undefined
            }
          >
            <div className="players-ring">
              {gameState.players.map((p, idx) => {
                const total = gameState.players.length;
                const visualIdx = (idx - seatOffset + total) % total;
                const angle = Math.PI / 2 + (visualIdx / total) * Math.PI * 2;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const leftPct = 50 + 42.2 * cosA;
                const topPct = 50 + 41.8 * sinA;
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
                      isHighlighted={highlightedPlayerId === p.id}
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
                myPlayerId={myPlayerId}
                highlightedPlayerId={highlightedPlayerId}
                onSelectArea={(areaId) => dispatchAction({ type: 'select_area', areaId })}
                onZoomImage={openZoom}
              />
            </div>
          </section>
        </div>

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
            onErstwhileSteal={(victimId, cardUid) =>
              dispatchAction({ type: 'erstwhile_steal', victimId, cardUid })
            }
            onResolveCardTarget={(targetId, extraCardUid) =>
              dispatchAction({ type: 'resolve_card_target', targetId, extraCardUid })
            }
            onHermitResponse={(choice, cardUid) =>
              dispatchAction({ type: 'hermit_response', choice, cardUid })
            }
            onOptionalRevealCard={(reveal) =>
              dispatchAction({ type: 'optional_reveal_card', reveal })
            }
            onSpearPrompt={(reveal) =>
              dispatchAction({ type: 'spear_prompt', reveal })
            }
            onBobChoice={(steal, cardUid) =>
              dispatchAction({ type: 'bob_choice', steal, cardUid })
            }
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
          subtitle={lightbox.subtitle}
          description={lightbox.description}
          autoCloseMs={lightbox.autoCloseMs}
          autoCloseKey={lightbox.autoCloseKey}
          lang={lang}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}

export default App;
