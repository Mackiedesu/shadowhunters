import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Lang } from '../i18n/translations';

interface Props {
  src: string;
  alt: string;
  subtitle?: string;
  description?: string;
  autoCloseMs?: number;
  autoCloseKey?: string;
  lang?: Lang;
  onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({
  src,
  alt,
  subtitle,
  description,
  autoCloseMs,
  autoCloseKey,
  lang = 'vi',
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const secs = autoCloseMs ? Math.round(autoCloseMs / 1000) : 0;

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X size={24} />
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {subtitle && <div className="lightbox-subtitle">{subtitle}</div>}
        <img src={src} alt={alt} className="lightbox-img" />
        {(description || autoCloseMs) && (
          <div className="lightbox-caption">
            <strong>{alt}</strong>
            {description && <p>{description}</p>}
            {autoCloseMs && (
              <div className="lightbox-auto-wrap">
                <div className="lightbox-progress-track">
                  <div
                    key={autoCloseKey || src}
                    className="lightbox-progress-bar"
                    style={{ animationDuration: `${autoCloseMs}ms` }}
                  />
                </div>
                <small className="lightbox-auto-hint">
                  {lang === 'vi'
                    ? `Tự đóng sau ${secs}s • Bấm ra ngoài để đóng ngay`
                    : `Auto-closes in ${secs}s • Click outside to dismiss`}
                </small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
