import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BookOpen,
  ChevronDown,
  Languages,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TRANSLATIONS, type Lang } from '../i18n/translations';

interface Props {
  lang: Lang;
  onToggleLang: () => void;
  bgmMuted: boolean;
  onToggleBgm: () => void;
  sfxMuted: boolean;
  onToggleSfx: () => void;
  onOpenReference?: () => void;
  onLeaveRoom?: () => void;
  compact?: boolean;
}

export const OptionsMenu: React.FC<Props> = ({
  lang,
  onToggleLang,
  bgmMuted,
  onToggleBgm,
  sfxMuted,
  onToggleSfx,
  onOpenReference,
  onLeaveRoom,
  compact = false,
}) => {
  const t = TRANSLATIONS[lang];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const iconSize = compact ? 14 : 16;

  return (
    <div className="options-menu-wrap" ref={rootRef}>
      <button
        type="button"
        className={`btn-ghost ${compact ? 'btn-sm' : ''} options-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Settings size={iconSize} />
        <span>{lang === 'vi' ? 'Tùy chọn' : 'Options'}</span>
        <ChevronDown size={14} className={`options-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="options-dropdown" role="menu">
          <button type="button" className="options-item" role="menuitem" onClick={onToggleBgm}>
            <span className="options-item-left">
              {bgmMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{lang === 'vi' ? 'Nhạc nền' : 'BGM'}</span>
            </span>
            <span className={`options-pill ${bgmMuted ? 'off' : 'on'}`}>
              {lang === 'vi' ? (bgmMuted ? 'Tắt' : 'Bật') : bgmMuted ? 'Off' : 'On'}
            </span>
          </button>

          <button type="button" className="options-item" role="menuitem" onClick={onToggleSfx}>
            <span className="options-item-left">
              {sfxMuted ? <BellOff size={15} /> : <Bell size={15} />}
              <span>{lang === 'vi' ? 'Hiệu ứng (SFX)' : 'Sound FX'}</span>
            </span>
            <span className={`options-pill ${sfxMuted ? 'off' : 'on'}`}>
              {lang === 'vi' ? (sfxMuted ? 'Tắt' : 'Bật') : sfxMuted ? 'Off' : 'On'}
            </span>
          </button>

          <button type="button" className="options-item" role="menuitem" onClick={onToggleLang}>
            <span className="options-item-left">
              <Languages size={15} />
              <span>{lang === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
            </span>
            <span className="options-pill neutral">
              {lang === 'vi' ? 'Tiếng Việt' : 'English'}
            </span>
          </button>

          {(onOpenReference || onLeaveRoom) && <div className="options-divider" />}

          {onOpenReference && (
            <button
              type="button"
              className="options-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenReference();
              }}
            >
              <span className="options-item-left">
                <BookOpen size={15} />
                <span>{t.rulesAndCards}</span>
              </span>
            </button>
          )}

          {onLeaveRoom && (
            <button
              type="button"
              className="options-item options-item-danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLeaveRoom();
              }}
            >
              <span className="options-item-left">
                <RotateCcw size={15} />
                <span>{t.leaveRoom}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
