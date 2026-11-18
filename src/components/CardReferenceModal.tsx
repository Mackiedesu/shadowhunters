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
import { TRANSLATIONS, type Lang } from '../i18n/translations';

interface Props {
  lang: Lang;
  onClose: () => void;
  onZoomImage: (src: string, alt: string) => void;
}

type Tab = 'rules' | 'characters' | 'black' | 'white' | 'hermit' | 'areas';

export const CardReferenceModal: React.FC<Props> = ({ lang, onClose, onZoomImage }) => {
  const t = TRANSLATIONS[lang];
  const [tab, setTab] = useState<Tab>('rules');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <BookOpen size={20} />
            <h2>{t.compendiumTitle}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="ref-tabs">
          <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
            <BookOpen size={15} /> {t.tabRules}
          </button>
          <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}>
            <Users size={15} /> {t.tabChars}
          </button>
          <button className={tab === 'black' ? 'active' : ''} onClick={() => setTab('black')}>
            <Skull size={15} /> {t.tabBlack}
          </button>
          <button className={tab === 'white' ? 'active' : ''} onClick={() => setTab('white')}>
            <Sparkles size={15} /> {t.tabWhite}
          </button>
          <button className={tab === 'hermit' ? 'active' : ''} onClick={() => setTab('hermit')}>
            <Leaf size={15} /> {t.tabHermit}
          </button>
          <button className={tab === 'areas' ? 'active' : ''} onClick={() => setTab('areas')}>
            <MapPin size={15} /> {t.tabAreas}
          </button>
        </div>

        <div className="modal-body">
          {tab === 'rules' && (
            <div className="rules-doc">
              <section>
                <h3>{t.rulesSec1Title}</h3>
                <p>{t.rulesSec1Body}</p>
                <div className="dist-grid">
                  {Object.entries(FACTION_DISTRIBUTION).map(([count, d]) => (
                    <div key={count} className="dist-chip">
                      <strong>{count} {t.players}:</strong> {d.Hunter}H / {d.Shadow}S / {d.Neutral}N
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>{t.rulesSec2Title}</h3>
                <ol>
                  <li>{t.rulesSec2Item1}</li>
                  <li>{t.rulesSec2Item2}</li>
                  <li>{t.rulesSec2Item3}</li>
                </ol>
              </section>

              <section>
                <h3>{t.rulesSec3Title}</h3>
                <p>{t.rulesSec3Body}</p>
              </section>
            </div>
          )}

          {tab === 'characters' && (
            <div className="ref-sections">
              {(['Hunter', 'Shadow', 'Neutral'] as const).map((faction) => {
                const chars = CHARACTERS.filter((c) => c.faction === faction);
                const color = getFactionColor(faction);
                return (
                  <section key={faction} className="ref-faction-section">
                    <h3
                      className="ref-faction-heading"
                      style={{ color, borderColor: color }}
                    >
                      {faction} ({chars.length})
                    </h3>
                    <div className="ref-grid">
                      {chars.map((c) => (
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
                              <span className="ref-name" style={{ color }}>
                                {c.name}
                              </span>
                              <span className="badge">
                                {c.maxHp} HP {c.isExpansion ? '• EX' : ''}
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
                  </section>
                );
              })}
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
