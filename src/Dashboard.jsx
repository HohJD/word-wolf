const GAMES = [
  {
    id: "wordwolf",
    name: "Word Wolf",
    icon: "🐺",
    tagline: "Find the odd one out",
    players: "3 – 20",
    tags: ["Deduction", "Bluffing"],
    gradient: "linear-gradient(135deg, #7c6af5 0%, #c9455a 100%)",
    glow: "rgba(124,106,245,0.35)",
    live: true,
  },
  {
    id: "truthordare",
    name: "Truth or Dare",
    icon: "🎲",
    tagline: "How brave are you?",
    players: "3+",
    tags: ["Party", "Daring"],
    gradient: "linear-gradient(135deg, #f5a623 0%, #e85d75 100%)",
    glow: "rgba(245,166,35,0.35)",
    live: true,
  },
  {
    id: "wouldyourather",
    name: "Would You Rather",
    icon: "🤔",
    tagline: "Impossible choices",
    players: "2+",
    tags: ["Debate", "Casual"],
    gradient: "linear-gradient(135deg, #0099f7 0%, #4ecb7b 100%)",
    glow: "rgba(0,153,247,0.35)",
    live: true,
  },
  {
    id: "mostlikelyto",
    name: "Most Likely To",
    icon: "👆",
    tagline: "Who would actually do it?",
    players: "4+",
    tags: ["Chaotic", "Social"],
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    glow: "rgba(240,147,251,0.35)",
    live: true,
  },
  {
    id: "hottakes",
    name: "Hot Takes",
    icon: "🔥",
    tagline: "Defend your opinion",
    players: "3+",
    tags: ["Debate", "Spicy"],
    gradient: "linear-gradient(135deg, #333 0%, #1a1a1a 100%)",
    glow: "transparent",
    live: false,
  },
  {
    id: "alias",
    name: "Alias",
    icon: "🗣️",
    tagline: "Describe without saying the word",
    players: "4+",
    tags: ["Team", "Fast-paced"],
    gradient: "linear-gradient(135deg, #2a2a3a 0%, #1a1a28 100%)",
    glow: "transparent",
    live: false,
  },
  {
    id: "mafia",
    name: "Mafia",
    icon: "🕵️",
    tagline: "Classic social deduction",
    players: "6+",
    tags: ["Deduction", "Strategy"],
    gradient: "linear-gradient(135deg, #2a2a3a 0%, #1a1a28 100%)",
    glow: "transparent",
    live: false,
  },
];

export default function Dashboard({ onPlay }) {
  const live = GAMES.filter((g) => g.live);
  const soon = GAMES.filter((g) => !g.live);

  return (
    <div className="dashboard view-enter">
      <div className="dash-header">
        <div className="dash-brand">
          <span className="dash-brand-icon">🎮</span>
          <div>
            <h1 className="dash-title">JD Games</h1>
            <p className="dash-sub">Party game collection</p>
          </div>
        </div>
      </div>

      <section className="dash-section">
        <h2 className="dash-section-title">Play Now</h2>
        <div className="game-grid">
          {live.map((game) => (
            <button
              key={game.id}
              className="game-card"
              style={{
                background: game.gradient,
                "--glow": game.glow,
              }}
              onClick={() => onPlay(game.id)}
            >
              <div className="gc-top">
                <span className="gc-icon">{game.icon}</span>
                <div className="gc-badges">
                  <span className="gc-live-badge">LIVE</span>
                </div>
              </div>
              <div className="gc-body">
                <p className="gc-name">{game.name}</p>
                <p className="gc-tagline">{game.tagline}</p>
              </div>
              <div className="gc-footer">
                <span className="gc-players">👥 {game.players}</span>
                <div className="gc-tags">
                  {game.tags.map((t) => (
                    <span key={t} className="gc-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">Coming Soon</h2>
        <div className="game-grid">
          {soon.map((game) => (
            <div
              key={game.id}
              className="game-card game-card--soon"
              style={{ background: game.gradient }}
            >
              <div className="gc-top">
                <span className="gc-icon" style={{ opacity: 0.4 }}>
                  {game.icon}
                </span>
                <span className="gc-soon-badge">SOON</span>
              </div>
              <div className="gc-body">
                <p className="gc-name" style={{ opacity: 0.5 }}>
                  {game.name}
                </p>
                <p className="gc-tagline" style={{ opacity: 0.35 }}>
                  {game.tagline}
                </p>
              </div>
              <div className="gc-footer">
                <span className="gc-players" style={{ opacity: 0.35 }}>
                  👥 {game.players}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="dash-footer">More games dropping soon 👀</p>
    </div>
  );
}
