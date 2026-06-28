export default function RevealRolesScreen({ state, dispatch }) {
  const { round } = state;
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  const isWolfOut = votedOut?.role === "wolf";

  return (
    <div className="screen reveal-roles-screen">
      <h2 className="screen-title">Roles Revealed</h2>

      <div className="word-reveal-pair">
        <div className="word-reveal-item villager-side">
          <p className="role-label">Villagers had</p>
          <p className="revealed-word">{round.villagerWord}</p>
        </div>
        <div className="word-reveal-divider">vs</div>
        <div className="word-reveal-item wolf-side">
          <p className="role-label">Wolf had</p>
          <p className="revealed-word">{round.wolfWord}</p>
        </div>
      </div>

      <div className="player-roles">
        {round.players.map((p) => (
          <div
            key={p.id}
            className={`role-row ${p.role} ${p.id === round.votedOutId ? "voted-out" : ""}`}
          >
            <span className="role-num">P{p.id}</span>
            <span className="role-word">{p.word}</span>
            <span className="role-badge">
              {p.role === "wolf" ? "🐺 Wolf" : p.role === "blank" ? "❓ Blank" : "👤 Villager"}
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

      <button className="btn-primary" onClick={() => dispatch({ type: "PROCEED_FROM_REVEAL" })}>
        {isWolfOut ? "Wolf's Last Chance →" : "See Result →"}
      </button>
    </div>
  );
}
