import { useMemo } from 'react';
import Avatar from './components/Avatar';

const GAMES = [
  {
    id: 'wordwolf',
    name: 'Word Wolf',
    icon: '🐺',
    tagline: 'Find the odd one out',
    players: '3 – 20',
    tags: ['Deduction', 'Bluffing'],
    bg: 'linear-gradient(145deg,#4c1d95,#9f1239)',
    glow: 'rgba(139,92,246,0.45)',
    live: true,
  },
  {
    id: 'truthordare',
    name: 'Truth or Dare',
    icon: '🎲',
    tagline: 'How brave are you?',
    players: '3+',
    tags: ['Party', 'Daring'],
    bg: 'linear-gradient(145deg,#92400e,#9f1239)',
    glow: 'rgba(217,119,6,0.45)',
    live: true,
  },
  {
    id: 'wouldyourather',
    name: 'Would You Rather',
    icon: '🤔',
    tagline: 'Impossible choices',
    players: '2+',
    tags: ['Debate', 'Casual'],
    bg: 'linear-gradient(145deg,#0e7490,#065f46)',
    glow: 'rgba(6,182,212,0.45)',
    live: true,
  },
  {
    id: 'mostlikelyto',
    name: 'Most Likely To',
    icon: '👆',
    tagline: "Who would actually do it?",
    players: '4+',
    tags: ['Chaotic', 'Social'],
    bg: 'linear-gradient(145deg,#86198f,#4c1d95)',
    glow: 'rgba(168,85,247,0.45)',
    live: true,
  },
  {
    id: 'hottakes',
    name: 'Hot Takes',
    icon: '🔥',
    tagline: 'Defend your opinion',
    players: '3+',
    tags: ['Debate', 'Spicy'],
    bg: 'linear-gradient(145deg,#ea580c,#7c2d12)',
    glow: 'rgba(234,88,12,0.45)',
    live: true,
  },
  {
    id: 'alias',
    name: 'Alias',
    icon: '🗣️',
    tagline: 'Describe without saying the word',
    players: '4+',
    tags: ['Team', 'Fast'],
    bg: 'linear-gradient(145deg,#2563eb,#7c3aed)',
    glow: 'rgba(37,99,235,0.45)',
    live: true,
  },
  {
    id: 'avalon',
    name: 'Avalon',
    icon: '🏰',
    tagline: 'Social deduction at the Round Table',
    players: '5–10',
    tags: ['Strategy', 'Deduction'],
    bg: 'linear-gradient(145deg,#3a2e1f,#1a1410)',
    glow: 'rgba(184,134,11,0.45)',
    live: true,
  },
  {
    id: 'mafia',
    name: 'Mafia',
    icon: '🕵️',
    tagline: 'Classic social deduction',
    players: '6+',
    tags: ['Strategy', 'Deduction'],
    bg: 'linear-gradient(145deg,#1c1c2e,#12121e)',
    glow: 'transparent',
    live: false,
  },
  {
    id: 'werewolves',
    name: 'Werewolves',
    icon: '🌕',
    tagline: 'Find the Werewolves before dawn',
    players: '5+',
    tags: ['Strategy', 'Deduction'],
    bg: 'linear-gradient(145deg,#1e293b,#0b0f1a)',
    glow: 'rgba(59,111,214,0.4)',
    live: true,
  },
];

export default function Dashboard({ onPlay, players, onEditPlayers, onHelp }) {
  const wordWolfTaglines = [
    'Can you spot the wolf?',
    "Who's bluffing tonight?",
    'One word is different...',
    'Sneak, bluff, and guess!',
    'Keep your poker face ready',
    'Trust no one (except snacks)',
  ];

  const randomWordWolfTag = useMemo(() => {
    return wordWolfTaglines[Math.floor(Math.random() * wordWolfTaglines.length)];
  }, []);

  const live = GAMES.filter(g => g.live);
  const soon = GAMES.filter(g => !g.live);

  return (
    <div className="dashboard view-enter">
      {/* Ambient orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* header removed per user request */}

      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-hero-emoji">🐺🎉</div>
          <div>
            <h2 className="dash-hero-title">Party games, big vibes</h2>
            <p className="dash-hero-tagline">{randomWordWolfTag}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => onPlay('wordwolf')}>Play Word Wolf</button>
      </div>

      {/* Player row */}
      <div className="dash-players-row">
        <span className="dash-players-label">Players</span>
        <div className="dash-players-chips">
          {players.length === 0 ? (
            <span className="dash-no-players">No players set</span>
          ) : (
            players.map(name => (
              <div key={name} className="player-chip">
                <Avatar name={name} size={22} />
                <span>{name}</span>
              </div>
            ))
          )}
        </div>
        <button className="edit-players-btn" onClick={onEditPlayers}>
          {players.length === 0 ? '+ Add' : 'Edit'}
        </button>
      </div>

      <section className="dash-section">
        <p className="dash-section-title">Play Now</p>
        <div className="game-grid">
          {live.map(game => (
            <button
              key={game.id}
              className="game-card"
              style={{ background: game.bg, '--card-glow': game.glow }}
              onClick={() => onPlay(game.id)}
            >
              <div className="gc-top">
                <span className="gc-icon">{game.icon}</span>
                <span className="gc-live-badge">LIVE</span>
              </div>
              <div className="gc-body">
                <p className="gc-name">{game.name}</p>
                <p className="gc-tagline">{game.tagline}</p>
              </div>
              <div className="gc-footer">
                <span className="gc-players">👥 {game.players}</span>
                <div className="gc-tags">
                  {game.tags.map(t => <span key={t} className="gc-tag">{t}</span>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-section">
        <p className="dash-section-title">Coming Soon</p>
        <div className="game-grid">
          {soon.map(game => (
            <div
              key={game.id}
              className="game-card game-card--soon"
              style={{ background: game.bg }}
            >
              <div className="gc-top">
                <span className="gc-icon" style={{ opacity: 0.35 }}>{game.icon}</span>
                <span className="gc-soon-badge">SOON</span>
              </div>
              <div className="gc-body">
                <p className="gc-name" style={{ opacity: 0.4 }}>{game.name}</p>
                <p className="gc-tagline" style={{ opacity: 0.3 }}>{game.tagline}</p>
              </div>
              <div className="gc-footer">
                <span className="gc-players" style={{ opacity: 0.3 }}>👥 {game.players}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="dash-footer">More games dropping soon 👀</p>
    </div>
  );
}
