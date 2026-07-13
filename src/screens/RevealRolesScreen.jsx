import Avatar from '../components/Avatar';

export default function RevealRolesScreen({ state, dispatch, players, onBack }) {
  const { round } = state;
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  const isWolfOut = votedOut?.role === 'wolf';
  const isBlankMode = round.wolfMode === 'blank';

  function nameFor(p) {
    return players?.[p.id - 1] || `Player ${p.id}`;
  }

  return (
    <div className="screen reveal-roles-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>🏠 Home</button>
      </div>

      <h2 className="screen-title">Roles Revealed</h2>

      <div className="word-reveal-pair">
        <div className="word-reveal-item villager-side">
          <p className="role-label">Villagers had</p>
          <p className="revealed-word">{round.villagerWord}</p>
        </div>
        <div className="word-reveal-divider">vs</div>
        <div className="word-reveal-item wolf-side">
          <p className="role-label">Wolf had</p>
          <p className="revealed-word">{isBlankMode ? '⬜ Blank' : round.wolfWord}</p>
        </div>
      </div>

      <div className="player-roles">
        {round.players.map((p) => (
          <div
            key={p.id}
            className={`role-row ${p.role} ${p.id === round.votedOutId ? 'voted-out' : ''}`}
          >
            <Avatar name={nameFor(p)} size={28} />
            <span className="role-word">{nameFor(p)}</span>
            <span className="role-badge">
              {p.role === 'wolf'
                ? isBlankMode ? '🐺 Wolf (blank)' : '🐺 Wolf'
                : '👤 Villager'}
            </span>
            {p.id === round.votedOutId && (
              <span className="voted-badge">VOTED OUT</span>
            )}
          </div>
        ))}
      </div>

      {isWolfOut ? (
        <div className="reveal-note wolf-caught">
          🐺 A Wolf was caught! But they get one last chance…
        </div>
      ) : votedOut ? (
        <div className="reveal-note villager-caught">
          😬 A Villager was voted out. The wolves survive!
        </div>
      ) : (
        <div className="reveal-note nobody-voted">
          No one was voted out. The wolves win!
        </div>
      )}

      <button className="btn-primary" onClick={() => dispatch({ type: 'PROCEED_FROM_REVEAL' })}>
        {isWolfOut ? "Wolf's Last Chance →" : 'See Result →'}
      </button>
    </div>
  );
}
