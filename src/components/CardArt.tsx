import React from 'react';
import type { AreaId, DeckType, Faction } from '../types/game';

export const AreaArtwork: React.FC<{ areaId: AreaId }> = ({ areaId }) => {
  switch (areaId) {
    case 'hermit_cabin':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <defs>
            <linearGradient id="cabinSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b3a28" />
              <stop offset="100%" stopColor="#0d1f15" />
            </linearGradient>
          </defs>
          <rect width="120" height="72" fill="url(#cabinSky)" />
          <circle cx="95" cy="18" r="9" fill="#a5d6a7" opacity="0.25" />
          <path d="M0 56 Q30 46 60 54 T120 52 L120 72 L0 72 Z" fill="#132a1c" />
          {/* Cabin */}
          <polygon points="38,38 60,20 82,38" fill="#4e342e" stroke="#8d6e63" strokeWidth="1.5" />
          <rect x="43" y="38" width="34" height="22" fill="#3e2723" stroke="#6d4c41" strokeWidth="1" />
          <rect x="55" y="46" width="10" height="14" fill="#1b120e" />
          <rect x="68" y="42" width="6" height="6" fill="#ffd54f" opacity="0.85" />
          {/* Pines */}
          <polygon points="16,58 24,30 32,58" fill="#1b5e20" />
          <polygon points="92,56 100,26 108,56" fill="#1b5e20" />
        </svg>
      );

    case 'underworld_gate':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <defs>
            <radialGradient id="gateGlow" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="#ce93d8" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#6a1b9a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#12071c" />
            </radialGradient>
          </defs>
          <rect width="120" height="72" fill="url(#gateGlow)" />
          {/* Stone Arch */}
          <path d="M35 66 L35 30 A25 25 0 0 1 85 30 L85 66" fill="none" stroke="#ab47bc" strokeWidth="5" />
          <path d="M41 66 L41 32 A19 19 0 0 1 79 32 L79 66" fill="#2a0845" opacity="0.8" />
          <circle cx="60" cy="40" r="10" fill="#e1bee7" opacity="0.5" />
          <path d="M0 66 L120 66" stroke="#4a148c" strokeWidth="3" />
        </svg>
      );

    case 'church':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <defs>
            <linearGradient id="churchSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a2f15" />
              <stop offset="100%" stopColor="#181309" />
            </linearGradient>
          </defs>
          <rect width="120" height="72" fill="url(#churchSky)" />
          {/* Light rays */}
          <polygon points="60,0 40,72 80,72" fill="#ffd54f" opacity="0.12" />
          {/* Steeple */}
          <polygon points="60,8 48,28 72,28" fill="#8d6e63" />
          <rect x="46" y="28" width="28" height="36" fill="#5d4037" stroke="#bcaaa4" strokeWidth="1" />
          {/* Cross */}
          <line x1="60" y1="12" x2="60" y2="24" stroke="#ffd54f" strokeWidth="2.5" />
          <line x1="55" y1="16" x2="65" y2="16" stroke="#ffd54f" strokeWidth="2.5" />
          <circle cx="60" cy="40" r="6" fill="#ffd54f" opacity="0.7" />
        </svg>
      );

    case 'cemetery':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <rect width="120" height="72" fill="#12161c" />
          <circle cx="24" cy="20" r="10" fill="#cfd8dc" opacity="0.25" />
          <path d="M0 54 Q60 46 120 56 L120 72 L0 72 Z" fill="#1c222b" />
          {/* Tombstones */}
          <path d="M30 58 L30 42 A8 8 0 0 1 46 42 L46 58 Z" fill="#455a64" />
          <path d="M68 60 L68 38 A10 10 0 0 1 88 38 L88 60 Z" fill="#37474f" />
          <line x1="78" y1="40" x2="78" y2="52" stroke="#90a4ae" strokeWidth="1.5" />
          <line x1="73" y1="44" x2="83" y2="44" stroke="#90a4ae" strokeWidth="1.5" />
        </svg>
      );

    case 'weird_woods':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <rect width="120" height="72" fill="#151d24" />
          {/* Twisted trees */}
          <path d="M25 68 Q28 45 18 22 M25 45 Q36 36 42 24" stroke="#546e7a" strokeWidth="3.5" fill="none" />
          <path d="M90 68 Q85 40 98 18 M88 46 Q74 34 68 22" stroke="#455a64" strokeWidth="3.5" fill="none" />
          <circle cx="60" cy="36" r="14" fill="#80cbc4" opacity="0.12" />
          <circle cx="56" cy="34" r="2" fill="#80cbc4" opacity="0.7" />
          <circle cx="64" cy="34" r="2" fill="#80cbc4" opacity="0.7" />
        </svg>
      );

    case 'erstwhile_altar':
      return (
        <svg viewBox="0 0 120 72" className="card-art-svg">
          <rect width="120" height="72" fill="#1e1410" />
          <polygon points="20,64 100,64 90,54 30,54" fill="#4e342e" />
          <rect x="42" y="38" width="36" height="16" fill="#6d4c41" stroke="#a1887f" strokeWidth="1" />
          {/* Relic chalice */}
          <polygon points="54,24 66,24 62,34 58,34" fill="#ffd54f" />
          <rect x="58" y="34" width="4" height="4" fill="#ffd54f" />
          <circle cx="60" cy="22" r="10" fill="#ffd54f" opacity="0.18" />
        </svg>
      );
  }
};

export const DeckBackArt: React.FC<{ deck: DeckType }> = ({ deck }) => {
  const palette =
    deck === 'white'
      ? { bg: '#f5f2e9', border: '#d4af37', inner: '#e8dfc8', symbol: '#b8860b', label: 'WHITE' }
      : deck === 'black'
      ? { bg: '#161318', border: '#c62828', inner: '#261b22', symbol: '#ef5350', label: 'DARK' }
      : { bg: '#13261a', border: '#66bb6a', inner: '#1c3b27', symbol: '#81c784', label: 'HERMIT' };

  return (
    <svg viewBox="0 0 80 112" className="deck-back-svg">
      <rect x="2" y="2" width="76" height="108" rx="8" fill={palette.bg} stroke={palette.border} strokeWidth="2.5" />
      <rect x="8" y="8" width="64" height="96" rx="5" fill={palette.inner} stroke={palette.border} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="40" cy="48" r="18" fill="none" stroke={palette.symbol} strokeWidth="2" />
      {deck === 'white' && (
        <path d="M40 34 L40 62 M26 48 L54 48" stroke={palette.symbol} strokeWidth="3" strokeLinecap="round" />
      )}
      {deck === 'black' && (
        <path d="M32 42 Q40 32 48 42 Q48 56 40 60 Q32 56 32 42 Z" fill={palette.symbol} opacity="0.85" />
      )}
      {deck === 'hermit' && (
        <path d="M40 33 C50 40 50 56 40 62 C30 56 30 40 40 33 Z" fill={palette.symbol} opacity="0.85" />
      )}
      <text
        x="40"
        y="86"
        textAnchor="middle"
        fill={palette.symbol}
        fontSize="10"
        fontWeight="800"
        letterSpacing="1.2"
      >
        {palette.label}
      </text>
    </svg>
  );
};

export const CharacterEmblem: React.FC<{ faction: Faction; name: string }> = ({ faction, name }) => {
  const color =
    faction === 'Hunter' ? '#4fc3f7' : faction === 'Shadow' ? '#ef5350' : '#ffd54f';
  const bg =
    faction === 'Hunter' ? '#0f2436' : faction === 'Shadow' ? '#2e1014' : '#2c240f';

  return (
    <svg viewBox="0 0 64 64" className="char-emblem-svg">
      <circle cx="32" cy="32" r="29" fill={bg} stroke={color} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="23" fill="none" stroke={color} strokeWidth="0.8" opacity="0.45" />
      <text
        x="32"
        y="39"
        textAnchor="middle"
        fill={color}
        fontSize="24"
        fontWeight="800"
      >
        {name[0]?.toUpperCase()}
      </text>
    </svg>
  );
};
