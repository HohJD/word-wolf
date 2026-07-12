import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

export default function PlayerSpinner({ players, size = 120, onComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [winner, setWinner] = useState(null);

  const names = players.length > 0 ? players : ['?'];
  const stepRef = useRef(0);
  const currentRef = useRef(0);
  const intervalRef = useRef(80);

  useEffect(() => {
    if (!spinning) return;
    stepRef.current = 0;
    currentRef.current = displayIndex;
    intervalRef.current = 80;
    const cycles = 25 + Math.floor(Math.random() * 15);

    let timer = null;

    const tick = () => {
      currentRef.current = (currentRef.current + 1) % names.length;
      stepRef.current += 1;
      setDisplayIndex(currentRef.current);

      if (stepRef.current >= cycles) {
        setSpinning(false);
        setWinner(names[currentRef.current]);
        onComplete?.(names[currentRef.current]);
        return;
      }

      // Slow down near the end
      if (stepRef.current > cycles - 8) intervalRef.current += 20;
      timer = setTimeout(tick, intervalRef.current);
    };

    timer = setTimeout(tick, intervalRef.current);
    return () => clearTimeout(timer);
  }, [spinning, names, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    if (spinning || names.length <= 1) {
      onComplete?.(names[0]);
      return;
    }
    setWinner(null);
    setSpinning(true);
  }

  return (
    <button className="player-spinner" onClick={start} disabled={spinning}>
      <div className={`ps-wheel ${spinning ? 'ps-spinning' : ''}`} style={{ width: size, height: size }}>
        <Avatar name={names[displayIndex]} size={size} />
      </div>
      {winner ? (
        <span className="ps-winner">{winner}</span>
      ) : (
        <span className="ps-hint">{spinning ? '...' : 'Tap to spin'}</span>
      )}
    </button>
  );
}
