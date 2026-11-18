import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  description?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ src, alt, description, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <img src={src} alt={alt} className="lightbox-img" />
        {description && (
          <div className="lightbox-caption">
            <strong>{alt}</strong>
            <p>{description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
