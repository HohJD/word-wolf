import Avatar from './Avatar';

export default function GameHeader({ onBack, title, subtitle, icon, activePlayer }) {
  return (
    <div className="gh-wrap">
      <button className="back-btn" onClick={onBack}>← Games</button>
      <div className="gh-center">
        <span className="gh-icon">{icon}</span>
        <h1 className="gh-title">{title}</h1>
        {subtitle && <p className="gh-sub">{subtitle}</p>}
      </div>
      {activePlayer ? (
        <div className="gh-player">
          <Avatar name={activePlayer} size={32} />
          <span className="gh-player-name">{activePlayer}</span>
        </div>
      ) : (
        <div className="gh-spacer" />
      )}
    </div>
  );
}
