import Avatar from './components/Avatar';

const GAMES = [
  {
    id: 'wordwolf',
    name: 'Word Wolf',
    icon: '🐺',
    tagline: 'Find the odd one out',
    players: '3–20',
    accent: '#8b5cf6',
    live: true,
  },
  {
    id: 'truthordare',
    name: 'Truth or Dare',
    icon: '🎲',
    tagline: 'How brave are you?',
    players: '3+',
    accent: '#d97706',
    live: true,
  },
  {
    id: 'wouldyourather',
    name: 'Would You Rather',
    icon: '🤔',
    tagline: 'Impossible choices',
    players: '2+',
    accent: '#06b6d4',
    live: true,
  },
  {
    id: 'mostlikelyto',
    name: 'Most Likely To',
    icon: '👆',
    tagline: 'Who’d actually do it?',
    players: '4+',
    accent: '#a855f7',
    live: true,
  },
  {
    id: 'hottakes',
    name: 'Hot Takes',
    icon: '🔥',
    tagline: 'Defend your opinion',
    players: '3+',
    accent: '#ea580c',
    live: true,
  },
  {
    id: 'alias',
    name: 'Alias',
    icon: '🗣️',
    tagline: 'Describe, don’t say it',
    players: '4+',
    accent: '#2563eb',
    live: true,
  },
  {
    id: 'avalon',
    name: 'Avalon',
    icon: '🏰',
    tagline: 'Find the hidden traitors',
    players: '5–10',
    accent: '#b8860b',
    live: true,
  },
  {
    id: 'werewolves',
    name: 'Werewolves',
    icon: '🌕',
    tagline: 'Hunt the Werewolves',
    players: '5+',
    accent: '#3b6fd6',
    live: true,
  },
  {
    id: 'mafia',
    name: 'Mafia',
    icon: '🕵️',
    tagline: 'Find the mafia',
    players: '6+',
    accent: '#6b7280',
    live: false,
  },
];

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function GameCard({ game, onPlay }) {
  const style = game.live ? { '--accent-bg': hexToRgba(game.accent, 0.16) } : undefined;
  return (
    <button
      className={`game-card${game.live ? '' : ' game-card--soon'}`}
      style={style}
      onClick={game.live ? () => onPlay(game.id) : undefined}
      disabled={!game.live}
    >
      <span className="gc-icon">{game.icon}</span>
      <span className="gc-body">
        <span className="gc-name">{game.name}</span>
        <span className="gc-tagline">{game.tagline}</span>
      </span>
      <span className="gc-meta">
        {game.live ? game.players : 'Soon'}
      </span>
    </button>
  );
}

export default function Dashboard({ onPlay, players, onEditPlayers }) {
  const live = GAMES.filter((g) => g.live);
  const soon = GAMES.filter((g) => !g.live);

  return (
    <div className="dashboard view-enter">
      <header className="dash-header">
        <span className="dash-title">JD Games</span>
        <span className="dash-sub">Party games for the group chat</span>
      </header>

      <div className="dash-players-row">
        <span className="dash-players-label">Players</span>
        <div className="dash-players-chips">
          {players.length === 0 ? (
            <span className="dash-no-players">No players set</span>
          ) : (
            players.map((name) => (
              <div key={name} className="player-chip">
                <Avatar name={name} size={20} />
                <span>{name}</span>
              </div>
            ))
          )}
        </div>
        <button className="edit-players-btn" onClick={onEditPlayers}>
          {players.length === 0 ? 'Add' : 'Edit'}
        </button>
      </div>

      <section className="dash-section">
        <p className="dash-section-title">Games</p>
        <div className="game-grid">
          {live.map((game) => (
            <GameCard key={game.id} game={game} onPlay={onPlay} />
          ))}
        </div>
      </section>

      {soon.length > 0 && (
        <section className="dash-section">
          <p className="dash-section-title">Coming soon</p>
          <div className="game-grid">
            {soon.map((game) => (
              <GameCard key={game.id} game={game} onPlay={onPlay} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
