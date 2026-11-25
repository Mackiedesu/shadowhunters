import React, { useEffect, useRef, useState } from 'react';

interface LastDice {
  d6: number;
  d4: number;
  label: string;
}

interface Props {
  lastDice: LastDice | null;
}

// 3x3 grid pip positions (1..9) for faces 1..6
const D6_PIPS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Target rotation so the rolled face faces front
const D6_ROTATIONS: Record<number, { rx: string; ry: string }> = {
  1: { rx: '0deg', ry: '0deg' },
  2: { rx: '90deg', ry: '0deg' },
  3: { rx: '0deg', ry: '-90deg' },
  4: { rx: '0deg', ry: '90deg' },
  5: { rx: '-90deg', ry: '0deg' },
  6: { rx: '0deg', ry: '180deg' },
};

const D6Face: React.FC<{ value: number; faceClass: string }> = ({ value, faceClass }) => {
  const pips = D6_PIPS[value] || D6_PIPS[1];
  return (
    <div className={`die3d-face ${faceClass}`}>
      {Array.from({ length: 9 }).map((_, idx) => (
        <span
          key={idx}
          className={`die3d-pip ${pips.includes(idx + 1) ? 'is-on' : ''}`}
        />
      ))}
    </div>
  );
};

export const DiceTray: React.FC<Props> = ({ lastDice }) => {
  const [rollKey, setRollKey] = useState(0);
  const prevSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastDice) {
      prevSigRef.current = null;
      return;
    }
    const sig = `${lastDice.d6}:${lastDice.d4}:${lastDice.label}`;
    if (prevSigRef.current !== sig) {
      prevSigRef.current = sig;
      setRollKey((k) => k + 1);
    }
  }, [lastDice]);

  if (!lastDice) return null;

  const d6Val = Math.min(6, Math.max(1, lastDice.d6 || 1));
  const rot = D6_ROTATIONS[d6Val] || D6_ROTATIONS[1];

  return (
    <div className="dice-tray-top-left" aria-live="polite">
      <div className="dice3d-pair" key={rollKey}>
        {lastDice.d6 > 0 && (
          <div className="die3d-scene" title={`d6: ${lastDice.d6}`}>
            <div
              className="die3d-cube is-rolling"
              style={
                {
                  '--rx': rot.rx,
                  '--ry': rot.ry,
                } as React.CSSProperties
              }
            >
              <D6Face value={1} faceClass="face-front" />
              <D6Face value={6} faceClass="face-back" />
              <D6Face value={3} faceClass="face-right" />
              <D6Face value={4} faceClass="face-left" />
              <D6Face value={5} faceClass="face-top" />
              <D6Face value={2} faceClass="face-bottom" />
            </div>
          </div>
        )}

        {lastDice.d4 > 0 && (
          <div className="die3d-d4-scene" title={`d4: ${lastDice.d4}`}>
            <div className="die3d-d4 is-rolling">
              <div className="die3d-d4-shape">
                <span className="die3d-d4-num">{lastDice.d4}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dice-tray-meta">
        <span className="dice-tray-label">{lastDice.label}</span>
      </div>
    </div>
  );
};
