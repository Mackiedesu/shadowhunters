import React, { useState } from 'react';
import { X, BookOpen, Users, Skull, Sparkles, Leaf, MapPin } from 'lucide-react';
import {
  AREA_LIST,
  BLACK_CARD_TEMPLATES,
  CHARACTERS,
  FACTION_DISTRIBUTION,
  HERMIT_CARD_TEMPLATES,
  WHITE_CARD_TEMPLATES,
  getFactionColor,
} from '../data/cards';

interface Props {
  onClose: () => void;
  onZoomImage: (src: string, alt: string) => void;
}

type Tab = 'rules' | 'characters' | 'black' | 'white' | 'hermit' | 'areas';

export const CardReferenceModal: React.FC<Props> = ({ onClose, onZoomImage }) => {
  const [tab, setTab] = useState<Tab>('rules');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <BookOpen size={20} />
            <h2>Shadow Hunters — Rules & Card Compendium</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="ref-tabs">
          <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
            <BookOpen size={15} /> Rules
          </button>
          <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}>
            <Users size={15} /> Characters (21)
          </button>
          <button className={tab === 'black' ? 'active' : ''} onClick={() => setTab('black')}>
            <Skull size={15} /> Black (16)
          </button>
          <button className={tab === 'white' ? 'active' : ''} onClick={() => setTab('white')}>
            <Sparkles size={15} /> White (16)
          </button>
          <button className={tab === 'hermit' ? 'active' : ''} onClick={() => setTab('hermit')}>
            <Leaf size={15} /> Hermit (16)
          </button>
          <button className={tab === 'areas' ? 'active' : ''} onClick={() => setTab('areas')}>
            <MapPin size={15} /> Areas (6)
          </button>
        </div>

        <div className="modal-body">
          {tab === 'rules' && (
            <div className="rules-doc">
              <section>
                <h3>1. Factions & Setup</h3>
                <p>
                  Each player receives a secret Character card belonging to one of three factions:
                  <strong style={{ color: '#4fc3f7' }}> Hunters</strong> (win when all Shadows are dead),
                  <strong style={{ color: '#ef5350' }}> Shadows</strong> (win when all Hunters are dead OR 3 Neutrals are dead), or
                  <strong style={{ color: '#ffd54f' }}> Neutrals</strong> (each has a unique Win Condition).
                </p>
                <div className="dist-grid">
                  {Object.entries(FACTION_DISTRIBUTION).map(([count, d]) => (
                    <div key={count} className="dist-chip">
                      <strong>{count} Players:</strong> {d.Hunter}H / {d.Shadow}S / {d.Neutral}N
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>2. Turn Structure</h3>
                <ol>
                  <li>
                    <strong>Move (Mandatory):</strong> Roll 1d6 + 1d4 and move to the Area matching the sum.
                    If you roll <strong>7</strong>, move to any Area of your choice. You cannot stay on the same Area (reroll if matched).
                  </li>
                  <li>
                    <strong>Area Action (Optional):</strong> Use the Area effect (draw White, Black, or Hermit cards, heal/damage at Weird Woods, or steal Equipment at Erstwhile Altar).
                  </li>
                  <li>
                    <strong>Attack (Optional):</strong> Attack 1 player in your <strong>Zone</strong> (your current Area or its paired Area on the board). Roll 1d6 and 1d4: damage = <code>|d6 - d4|</code> (0 = miss).
                  </li>
                </ol>
              </section>

              <section>
                <h3>3. Revealing & Death</h3>
                <p>
                  You may reveal your Character at any time on your turn to activate Special Abilities.
                  If your damage reaches or exceeds your Max HP, you die and your identity is revealed.
                  If you kill a player by attacking, you may steal 1 of their Equipment cards (or all with Silver Rosary / Bob ex).
                </p>
              </section>
            </div>
          )}

          {tab === 'characters' && (
            <div className="ref-grid">
              {CHARACTERS.map((c) => (
                <div key={c.id} className="ref-card ref-with-img">
                  <img
                    src={`/assets/characters/${c.id}.webp`}
                    alt={c.name}
                    className="ref-thumb"
                    title="Click to view full screen"
                    onClick={() =>
                      onZoomImage(`/assets/characters/${c.id}.webp`, c.name)
                    }
                  />
                  <div className="ref-card-content">
                    <div className="ref-card-top">
                      <span className="ref-name" style={{ color: getFactionColor(c.faction) }}>
                        {c.name}
                      </span>
                      <span className="badge">
                        {c.faction} • {c.maxHp} HP {c.isExpansion ? '• EX' : ''}
                      </span>
                    </div>
                    <p className="ref-sub">
                      <strong>Win:</strong> {c.winCondition}
                    </p>
                    <p className="ref-desc">
                      <strong>{c.abilityName}:</strong> {c.abilityDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'black' && (
            <div className="ref-grid">
              {BLACK_CARD_TEMPLATES.map((c) => (
                <div key={c.id} className="ref-card ref-black ref-with-img">
                  <img
                    src={`/assets/cards/${c.id}.webp`}
                    alt={c.name}
                    className="ref-thumb"
                    title="Click to view full screen"
                    onClick={() => onZoomImage(`/assets/cards/${c.id}.webp`, c.name)}
                  />
                  <div className="ref-card-content">
                    <div className="ref-card-top">
                      <span className="ref-name">{c.name}</span>
                      <span className="badge">{c.kind} ×{c.count}</span>
                    </div>
                    <p className="ref-desc">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'white' && (
            <div className="ref-grid">
              {WHITE_CARD_TEMPLATES.map((c) => (
                <div key={c.id} className="ref-card ref-white ref-with-img">
                  <img
                    src={`/assets/cards/${c.id}.webp`}
                    alt={c.name}
                    className="ref-thumb"
                    title="Click to view full screen"
                    onClick={() => onZoomImage(`/assets/cards/${c.id}.webp`, c.name)}
                  />
                  <div className="ref-card-content">
                    <div className="ref-card-top">
                      <span className="ref-name">{c.name}</span>
                      <span className="badge">{c.kind} ×{c.count}</span>
                    </div>
                    <p className="ref-desc">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'hermit' && (
            <div className="ref-grid">
              {HERMIT_CARD_TEMPLATES.map((c) => (
                <div key={c.id} className="ref-card ref-hermit ref-with-img">
                  <img
                    src={`/assets/cards/${c.id}.webp`}
                    alt={c.name}
                    className="ref-thumb"
                    title="Click to view full screen"
                    onClick={() => onZoomImage(`/assets/cards/${c.id}.webp`, c.name)}
                  />
                  <div className="ref-card-content">
                    <div className="ref-card-top">
                      <span className="ref-name">{c.name}</span>
                      <span className="badge">×{c.count}</span>
                    </div>
                    <p className="ref-desc">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'areas' && (
            <div className="ref-grid">
              {AREA_LIST.map((a) => (
                <div key={a.id} className="ref-card ref-with-img" style={{ borderLeft: `4px solid ${a.accent}` }}>
                  <img
                    src={`/assets/areas/${a.id}.webp`}
                    alt={a.name}
                    className="ref-thumb"
                    title="Click to view full screen"
                    onClick={() => onZoomImage(`/assets/areas/${a.id}.webp`, a.name)}
                  />
                  <div className="ref-card-content">
                    <div className="ref-card-top">
                      <span className="ref-name">{a.name}</span>
                      <span className="badge">Roll: {a.numbers.join(' or ')}</span>
                    </div>
                    <p className="ref-desc">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
