import { useEffect, useState, type RefObject } from 'react';

interface FitScaleResult {
  scale: number;
  active: boolean;
}

export function useFitScale(
  containerRef: RefObject<HTMLElement | null>,
  designWidth: number,
  designHeight: number,
  enabled = true,
  minDesktopWidth = 900
): FitScaleResult {
  const [result, setResult] = useState<FitScaleResult>({ scale: 1, active: false });

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const compute = () => {
      if (window.innerWidth < minDesktopWidth) {
        setResult((prev) => (prev.active || prev.scale !== 1 ? { scale: 1, active: false } : prev));
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const padW = Math.max(0, rect.width - 8);
      const padH = Math.max(0, rect.height - 8);
      const raw = Math.min(padW / designWidth, padH / designHeight);
      const clamped = Math.min(1.04, Math.max(0.46, Number(raw.toFixed(4))));

      setResult((prev) =>
        prev.active && Math.abs(prev.scale - clamped) < 0.003
          ? prev
          : { scale: clamped, active: true }
      );
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [containerRef, designWidth, designHeight, enabled, minDesktopWidth]);

  return result;
}
