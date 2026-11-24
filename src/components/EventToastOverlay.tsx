import React, { useEffect, useRef, useState } from 'react';
import { translateLogText } from '../i18n/cardTranslations';
import type { Lang } from '../i18n/translations';
import type { LogEntry } from '../types/game';

interface Props {
  lang: Lang;
  logs: LogEntry[];
}

interface ToastItem {
  id: number;
  tone: LogEntry['tone'];
  text: string;
}

function isToastWorthy(entry: LogEntry): boolean {
  if (entry.tone === 'combat' || entry.tone === 'heal' || entry.tone === 'reveal' || entry.tone === 'death' || entry.tone === 'win') {
    return true;
  }
  if (entry.tone === 'card') {
    return (
      entry.text.includes('Dynamite') ||
      entry.text.includes('took ') ||
      entry.text.includes('First Aid') ||
      entry.text.includes('Guardian Angel') ||
      entry.text.includes('extra turn') ||
      entry.text.includes('gave a Hermit card')
    );
  }
  return false;
}

export const EventToastOverlay: React.FC<Props> = ({ lang, logs }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const maxLogIdRef = useRef<number | null>(null);
  const timersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const maxId = logs.reduce((m, l) => Math.max(m, l.id), 0);

    // First snapshot: seed maxLogId without replaying historical logs
    if (maxLogIdRef.current === null) {
      maxLogIdRef.current = maxId;
      return;
    }

    if (logs.length === 0) {
      maxLogIdRef.current = 0;
      setToasts([]);
      return;
    }

    const incoming = logs
      .filter((l) => l.id > (maxLogIdRef.current ?? 0) && isToastWorthy(l))
      .reverse();

    if (maxId > (maxLogIdRef.current ?? 0)) {
      maxLogIdRef.current = maxId;
    }

    if (incoming.length === 0) return;

    const picked = incoming.slice(-2).map((l) => ({
      id: l.id,
      tone: l.tone,
      text: translateLogText(l.text, lang),
    }));

    setToasts((prev) => {
      const merged = [...prev.filter((x) => !picked.some((p) => p.id === x.id)), ...picked];
      return merged.slice(-2);
    });

    for (const item of picked) {
      const existing = timersRef.current.get(item.id);
      if (existing) window.clearTimeout(existing);
      const timerId = window.setTimeout(() => {
        timersRef.current.delete(item.id);
        setToasts((prev) => prev.filter((x) => x.id !== item.id));
      }, 3200);
      timersRef.current.set(item.id, timerId);
    }
  }, [logs, lang]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="event-toast-overlay" aria-live="polite">
      {toasts.map((item) => (
        <div key={item.id} className={`event-toast toast-${item.tone}`}>
          {item.text}
        </div>
      ))}
    </div>
  );
};
