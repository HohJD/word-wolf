import Avatar from './Avatar';

export default function GameHeader({ onBack, title, subtitle, icon, activePlayer, activeLabel = 'Leader', backLabel = '← Games' }) {
  return (
    <div className="gh-wrap">
      <button className="back-btn" onClick={onBack}>{backLabel}</button>
      <div className="gh-center">
        <span className="gh-icon">{icon}</span>
        <h1 className="gh-title">{title}</h1>
        {subtitle && <p className="gh-sub">{subtitle}</p>}
      </div>
      {activePlayer ? (
        // Labelled, because an unlabelled name chip reads as "this is you"
        // when it actually names the current leader.
        <div className="gh-player">
          <span className="gh-player-label">{activeLabel}</span>
          <span className="gh-player-id">
            <Avatar name={activePlayer} size={24} />
            <span className="gh-player-name">{activePlayer}</span>
          </span>
        </div>
      ) : (
        <div className="gh-spacer" />
      )}
    </div>
  );
}
