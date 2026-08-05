export default function ModeSelect({ onPick, onBack, onlineAvailable }) {
  return (
    <div className="screen avalon-screen avalon-lobby view-enter">
      <div className="avalon-hero">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <span className="avalon-castle">🏰</span>
        <h1 className="avalon-title">Avalon</h1>
        <p className="avalon-subtitle">Some players are secretly evil. Work together to find them.</p>
      </div>

      <div className="avalon-modes">
        <button className="avalon-mode" onClick={() => onPick('online')} disabled={!onlineAvailable}>
          <span className="avalon-mode-icon">📱</span>
          <span className="avalon-mode-body">
            <span className="avalon-mode-name">Play online</span>
            <span className="avalon-mode-desc">
              {onlineAvailable
                ? 'Everyone joins on their own phone with a room code. 5–10 players.'
                : 'Unavailable — online play is not configured.'}
            </span>
          </span>
        </button>

        <button className="avalon-mode" onClick={() => onPick('pass')}>
          <span className="avalon-mode-icon">🤝</span>
          <span className="avalon-mode-body">
            <span className="avalon-mode-name">Pass & play</span>
            <span className="avalon-mode-desc">One phone passed around the group. No internet needed.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
