import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  autoActOnTimeout,
  createInitialGameState,
} from '../src/engine/gameEngine.ts';
import {
  applyClientAction,
  getExpectedHumanActorId,
  isBotTurnOrPending,
  stepAI,
} from '../src/engine/actionHandler.ts';
import type { ClientAction } from '../src/engine/actionHandler.ts';
import type { CharacterDef, GameState } from '../src/types/game.ts';

interface Seat {
  clientId: string;
  playerName: string;
}

interface Room {
  code: string;
  name: string;
  maxPlayers: number;
  hostClientId: string;
  status: 'waiting' | 'playing' | 'finished';
  seats: Seat[];
  gameState: GameState | null;
  timerSeconds: number | null;
  lastTimerKey: string;
  aiTimer: ReturnType<typeof setTimeout> | null;
  countdownInterval: ReturnType<typeof setInterval> | null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const PORT = Number(process.env.PORT || process.env.ROOM_PORT || 5174);

const httpServer = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shadow Hunters WebSocket Server (run npm run build to serve frontend)');
    return;
  }

  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const cacheControl =
    urlPath.startsWith('/assets/') && ext !== '.html'
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
});

const wss = new WebSocketServer({ server: httpServer });

const clients = new Map<string, { ws: WebSocket; roomCode: string | null }>();
const rooms = new Map<string, Room>();

let idSeq = 1;
function makeClientId(): string {
  return `c_${Date.now().toString(36)}_${idSeq++}`;
}

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? makeRoomCode() : code;
}

const HIDDEN_CHARACTER: CharacterDef = {
  id: 'hidden',
  name: 'Hidden',
  faction: 'Neutral',
  maxHp: 12,
  isExpansion: false,
  winCondition: '',
  abilityName: '',
  abilityDescription: '',
};

function sanitizeGameStateForPlayer(state: GameState, myPlayerIndex: number): GameState {
  const myId = `p_${myPlayerIndex}`;
  const current = state.players[state.currentPlayerIndex];
  const hideHermitBanner =
    state.lastDrawnCard?.deck === 'hermit' && current?.id !== myId;

  return {
    ...state,
    lastDrawnCard: hideHermitBanner ? null : state.lastDrawnCard,
    players: state.players.map((p, idx) => {
      const canSee = idx === myPlayerIndex || p.revealed || !p.alive;
      return {
        ...p,
        character: canSee ? p.character : HIDDEN_CHARACTER,
        knownIdentities: idx === myPlayerIndex ? p.knownIdentities : {},
      };
    }),
  };
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoomsList() {
  const list = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    name: r.name,
    maxPlayers: r.maxPlayers,
    humanCount: r.seats.length,
    status: r.status,
  }));
  for (const c of clients.values()) {
    send(c.ws, { type: 'rooms_list', rooms: list });
  }
}

function broadcastRoomState(room: Room) {
  room.seats.forEach((seat, idx) => {
    const client = clients.get(seat.clientId);
    if (!client) return;
    send(client.ws, {
      type: 'room_state',
      room: {
        code: room.code,
        name: room.name,
        maxPlayers: room.maxPlayers,
        hostClientId: room.hostClientId,
        status: room.status,
        seats: room.seats,
      },
      yourPlayerIndex: idx,
      yourClientId: seat.clientId,
      gameState: room.gameState ? sanitizeGameStateForPlayer(room.gameState, idx) : null,
      timerSeconds: room.timerSeconds,
    });
  });
}

function clearRoomTimers(room: Room) {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = null;
  }
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }
}

function syncRoomLoop(room: Room) {
  if (!room.gameState) return;
  if (room.gameState.phase === 'game_over') {
    room.status = 'finished';
    room.timerSeconds = null;
    clearRoomTimers(room);
    broadcastRoomState(room);
    broadcastRoomsList();
    return;
  }

  // Schedule AI step if needed (2s delay)
  if (isBotTurnOrPending(room.gameState)) {
    room.timerSeconds = null;
    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
    }
    if (!room.aiTimer) {
      room.aiTimer = setTimeout(() => {
        room.aiTimer = null;
        if (!room.gameState) return;
        room.gameState = stepAI(room.gameState);
        broadcastRoomState(room);
        syncRoomLoop(room);
      }, 2000);
    }
    return;
  }

  // Human action: 45s countdown
  const s = room.gameState;
  const key = `${s.turnNumber}:${s.currentPlayerIndex}:${s.phase}:${s.hasMoved}:${s.hasUsedArea}:${s.hasAttacked}:${s.pending?.type || 'none'}`;
  if (room.lastTimerKey !== key) {
    room.lastTimerKey = key;
    room.timerSeconds = 45;
    if (room.countdownInterval) clearInterval(room.countdownInterval);
    room.countdownInterval = setInterval(() => {
      if (!room.gameState || room.timerSeconds === null) return;
      if (room.timerSeconds <= 1) {
        clearInterval(room.countdownInterval!);
        room.countdownInterval = null;
        room.timerSeconds = 0;
        room.gameState = autoActOnTimeout(room.gameState);
        broadcastRoomState(room);
        syncRoomLoop(room);
      } else {
        room.timerSeconds -= 1;
        // Broadcast lightweight timer tick
        for (const seat of room.seats) {
          const c = clients.get(seat.clientId);
          if (c) send(c.ws, { type: 'timer_tick', timerSeconds: room.timerSeconds });
        }
      }
    }, 1000);
  }
}

function leaveCurrentRoom(clientId: string) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  client.roomCode = null;
  if (!room) return;

  const seatIdx = room.seats.findIndex((s) => s.clientId === clientId);
  if (seatIdx !== -1) {
    if (room.status === 'playing' && room.gameState) {
      // Convert disconnected player into an AI bot so the room continues smoothly
      const playerId = `p_${seatIdx}`;
      room.gameState = {
        ...room.gameState,
        players: room.gameState.players.map((p) =>
          p.id === playerId ? { ...p, isHuman: false, name: `${p.name} (Bot)` } : p
        ),
      };
      room.seats[seatIdx].clientId = `bot_${Date.now()}`;
      syncRoomLoop(room);
    } else {
      room.seats.splice(seatIdx, 1);
    }
  }

  const activeHumans = room.seats.filter((s) => clients.has(s.clientId));
  if (activeHumans.length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.code);
  } else {
    if (room.hostClientId === clientId) {
      room.hostClientId = activeHumans[0].clientId;
    }
    broadcastRoomState(room);
  }
  broadcastRoomsList();
}

wss.on('connection', (ws) => {
  const clientId = makeClientId();
  clients.set(clientId, { ws, roomCode: null });

  send(ws, {
    type: 'rooms_list',
    rooms: Array.from(rooms.values()).map((r) => ({
      code: r.code,
      name: r.name,
      maxPlayers: r.maxPlayers,
      humanCount: r.seats.length,
      status: r.status,
    })),
  });

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const client = clients.get(clientId);
    if (!client) return;

    if (msg.type === 'list_rooms') {
      broadcastRoomsList();
      return;
    }

    if (msg.type === 'create_room') {
      leaveCurrentRoom(clientId);
      const code = makeRoomCode();
      const maxPlayers = Math.min(8, Math.max(4, Number(msg.maxPlayers) || 6));
      const playerName = String(msg.playerName || 'Host').trim().slice(0, 16) || 'Host';
      const roomName = String(msg.roomName || `Room ${code}`).trim().slice(0, 24) || `Room ${code}`;

      const room: Room = {
        code,
        name: roomName,
        maxPlayers,
        hostClientId: clientId,
        status: 'waiting',
        seats: [{ clientId, playerName }],
        gameState: null,
        timerSeconds: null,
        lastTimerKey: '',
        aiTimer: null,
        countdownInterval: null,
      };
      rooms.set(code, room);
      client.roomCode = code;
      broadcastRoomState(room);
      broadcastRoomsList();
      return;
    }

    if (msg.type === 'join_room') {
      const code = String(msg.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: 'error', message: `Room ${code} not found.` });
        return;
      }
      if (room.status !== 'waiting') {
        send(ws, { type: 'error', message: `Room ${code} has already started.` });
        return;
      }
      if (room.seats.length >= room.maxPlayers) {
        send(ws, { type: 'error', message: `Room ${code} is full.` });
        return;
      }
      leaveCurrentRoom(clientId);
      const playerName =
        String(msg.playerName || `Player ${room.seats.length + 1}`).trim().slice(0, 16) ||
        `Player ${room.seats.length + 1}`;
      room.seats.push({ clientId, playerName });
      client.roomCode = code;
      broadcastRoomState(room);
      broadcastRoomsList();
      return;
    }

    if (msg.type === 'leave_room') {
      leaveCurrentRoom(clientId);
      send(ws, { type: 'left_room' });
      return;
    }

    if (msg.type === 'start_room_game') {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.hostClientId !== clientId || room.status !== 'waiting') return;

      clearRoomTimers(room);
      room.status = 'playing';
      room.lastTimerKey = '';
      room.gameState = createInitialGameState({
        playerCount: room.maxPlayers,
        humanCount: room.seats.length,
        humanNames: room.seats.map((s) => s.playerName),
        includeExpansion: true,
      });
      // Disable pass-and-play privacy gate in online rooms since each player has their own device
      if (room.gameState.pending?.type === 'pass_and_play_gate') {
        room.gameState = { ...room.gameState, pending: null };
      }
      broadcastRoomState(room);
      broadcastRoomsList();
      syncRoomLoop(room);
      return;
    }

    if (msg.type === 'game_action') {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || !room.gameState || room.status !== 'playing') return;

      const seatIdx = room.seats.findIndex((s) => s.clientId === clientId);
      if (seatIdx === -1) return;
      const actorId = `p_${seatIdx}`;

      const expected = getExpectedHumanActorId(room.gameState);
      if (expected !== actorId) return;

      if (room.aiTimer) {
        clearTimeout(room.aiTimer);
        room.aiTimer = null;
      }

      room.gameState = applyClientAction(room.gameState, actorId, msg.action as ClientAction);
      // Clear any pass_and_play_gate if triggered on turn wrap
      if (room.gameState.pending?.type === 'pass_and_play_gate') {
        room.gameState = { ...room.gameState, pending: null };
      }
      broadcastRoomState(room);
      syncRoomLoop(room);
    }
  });

  ws.on('close', () => {
    leaveCurrentRoom(clientId);
    clients.delete(clientId);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Shadow Hunters server listening on http://0.0.0.0:${PORT}`);
});
