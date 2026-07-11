import { useMemo } from 'react';

const COLORS = ['#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f43f5e','#a78bfa','#fbbf24'];

export default function Confetti({ count = 60 }) {
  const pieces = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: (i / count) * 100 + (Math.sin(i * 2.4) * 8),
      delay: (i / count) * 2.5,
      duration: 2.2 + ((i * 137) % 100) / 50,
      size: 7 + ((i * 73) % 8),
      rotate: (i * 137) % 360,
      drift: (((i * 41) % 60) - 30),
    })),
    [count]
  );

  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.4,
            borderRadius: 2,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
