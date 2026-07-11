const PALETTE = [
  '#8b5cf6','#ec4899','#06b6d4','#f59e0b',
  '#10b981','#f43f5e','#3b82f6','#a855f7',
];

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({ name, size = 36 }) {
  const bg = colorFor(name || '?');
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.38),
        boxShadow: `0 0 12px ${bg}55`,
      }}
    >
      {initials}
    </div>
  );
}
