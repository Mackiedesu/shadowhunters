import React, { useState } from 'react';
import { Play, BookOpen, Plus, LogIn, LogOut, Copy } from 'lucide-react';
import { FACTION_DISTRIBUTION } from '../data/cards';

export interface RoomSummary {
  code: string;
  name: string;
  maxPlayers: number;
  humanCount: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface RoomDetail {
  code: string;
  name: string;
  maxPlayers: number;
  hostClientId: string;
  status: 'waiting' | 'playing' | 'finished';
  seats: { clientId: string; playerName: string }[];
}

interface Props {
  onOpenReference: () => void;
  wsConnected: boolean;
  wsError: string | null;
  rooms: RoomSummary[];
  currentRoom: RoomDetail | null;
  yourClientId: string | null;
  onCreateRoom: (roomName: string, maxPlayers: number, playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onLeaveRoom: () => void;
  onStartRoomGame: () => void;
}

export const SetupScreen: React.FC<Props> = ({
  onOpenReference,
  wsConnected,
  wsError,
  rooms,
  currentRoom,
  yourClientId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartRoomGame,
}) => {
  const [onlineName, setOnlineName] = useState('Hunter');
  const [roomName, setRoomName] = useState('');
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(6);
  const [joinCode, setJoinCode] = useState('');

  const dist = FACTION_DISTRIBUTION[roomMaxPlayers];

  return (
    <div className="setup-wrapper">
      <div className="setup-card">
        <div className="setup-hero">
          <div className="hero-crest">⚔️</div>
          <h1>SHADOW HUNTERS</h1>
          <p className="subtitle">
            Hidden Identity • Multi-Room Tabletop • Expansion Included
          </p>
        </div>

        {currentRoom && currentRoom.status === 'waiting' ? (
          <div className="waiting-room">
            <div className="waiting-header">
              <div>
                <small className="room-code-label">ROOM CODE</small>
                <div className="room-code-row">
                  <strong className="room-code-big">{currentRoom.code}</strong>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => navigator.clipboard?.writeText(currentRoom.code)}
                    title="Copy Room Code"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
              </div>
              <div className="waiting-meta">
                <strong>{currentRoom.name}</strong>
                <span>
                  {currentRoom.seats.length} / {currentRoom.maxPlayers} Humans (rest AI Bots)
                </span>
              </div>
            </div>

            <div className="seat-list">
              {Array.from({ length: currentRoom.maxPlayers }).map((_, idx) => {
                const seat = currentRoom.seats[idx];
                const isHost = seat?.clientId === currentRoom.hostClientId;
                const isYou = seat?.clientId === yourClientId;
                return (
                  <div key={idx} className={`seat-row ${seat ? 'seat-filled' : 'seat-bot'}`}>
                    <span>
                      Seat {idx + 1}:{' '}
                      <strong>{seat ? seat.playerName : 'AI Bot (Auto)'}</strong>
                    </span>
                    <div className="seat-tags">
                      {isHost && <span className="tag neutral">HOST</span>}
                      {isYou && <span className="tag hunter">YOU</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="setup-actions">
              {currentRoom.hostClientId === yourClientId ? (
                <button type="button" className="btn-primary btn-lg" onClick={onStartRoomGame}>
                  <Play size={18} /> Start Game ({currentRoom.maxPlayers} Players)
                </button>
              ) : (
                <div className="bot-thinking" style={{ flex: 1, justifyContent: 'center' }}>
                  <span className="pulse-dot" />
                  <span>Waiting for Host to start...</span>
                </div>
              )}
              <button type="button" className="btn-secondary btn-lg" onClick={onLeaveRoom}>
                <LogOut size={18} /> Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="setup-form">
            <div className="ws-status-row">
              <span className={`ws-dot ${wsConnected ? 'online' : 'offline'}`} />
              <span>
                {wsConnected
                  ? 'Room Server Connected — Multiple rooms can play simultaneously'
                  : 'Connecting to Room Server (port 5174)...'}
              </span>
            </div>

            {wsError && <div className="error-banner">{wsError}</div>}

            <div className="form-group">
              <label>Your Display Name</label>
              <input
                type="text"
                className="text-input"
                value={onlineName}
                maxLength={16}
                placeholder="Enter your name"
                onChange={(e) => setOnlineName(e.target.value)}
              />
            </div>

            <div className="room-split-grid">
              <div className="room-box">
                <h4>
                  <Plus size={15} /> Create New Room
                </h4>
                <input
                  type="text"
                  className="text-input"
                  value={roomName}
                  maxLength={24}
                  placeholder="Room Name (optional)"
                  onChange={(e) => setRoomName(e.target.value)}
                />
                <div className="pill-row">
                  {[4, 5, 6, 7, 8].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={`pill-btn ${roomMaxPlayers === n ? 'active' : ''}`}
                      onClick={() => setRoomMaxPlayers(n)}
                    >
                      {n}P
                    </button>
                  ))}
                </div>
                <div className="faction-preview">
                  <span className="tag hunter">{dist.Hunter}H</span>
                  <span className="tag shadow">{dist.Shadow}S</span>
                  <span className="tag neutral">{dist.Neutral}N</span>
                </div>
                <button
                  type="button"
                  disabled={!wsConnected}
                  className="btn-primary"
                  onClick={() => onCreateRoom(roomName, roomMaxPlayers, onlineName)}
                >
                  <Plus size={16} /> Create Room
                </button>
              </div>

              <div className="room-box">
                <h4>
                  <LogIn size={15} /> Join by Code
                </h4>
                <input
                  type="text"
                  className="text-input"
                  value={joinCode}
                  maxLength={6}
                  placeholder="Enter Code (e.g. A7K9)"
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  disabled={!wsConnected || !joinCode.trim()}
                  className="btn-accent"
                  onClick={() => onJoinRoom(joinCode.trim(), onlineName)}
                >
                  <LogIn size={16} /> Join Room
                </button>
              </div>
            </div>

            <div className="rooms-list-box">
              <h4>Active Rooms ({rooms.length})</h4>
              {rooms.length === 0 ? (
                <p className="hint-text">No active rooms yet. Create one to start!</p>
              ) : (
                <div className="rooms-list">
                  {rooms.map((r) => (
                    <div key={r.code} className="room-list-item">
                      <div>
                        <strong>{r.name}</strong>{' '}
                        <span className="room-code-chip">{r.code}</span>
                        <small>
                          {r.humanCount}/{r.maxPlayers} players •{' '}
                          {r.status === 'waiting'
                            ? 'Waiting'
                            : r.status === 'playing'
                            ? 'In Game'
                            : 'Finished'}
                        </small>
                      </div>
                      <button
                        type="button"
                        disabled={!wsConnected || r.status !== 'waiting' || r.humanCount >= r.maxPlayers}
                        className="btn-secondary btn-sm"
                        onClick={() => onJoinRoom(r.code, onlineName)}
                      >
                        {r.status === 'waiting' ? 'Join' : 'Playing'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-secondary btn-lg"
              onClick={onOpenReference}
            >
              <BookOpen size={18} /> Rules & Cards
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
