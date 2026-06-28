export default function ResultScreen({ state, dispatch }) {
  const { round, config } = state;
  const wolves = round.players.filter((p) => p.role === "wolf");
  const villagers = round.players.filter((p) => p.role === "villager");
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  const wolvesWin = round.winner === "wolves";

  return (
    <div className="screen result-screen">
      <div className={`result-banner ${wolvesWin ? "wolves-win" : "villagers-win"}`}>
        <div className="result-icon">{wolvesWin ? "🐺" : "🏡"}</div>
        <h1 className="result-title">
          {wolvesWin ? "Wolves Win!" : "Villagers Win!"}
        </h1>
        {round.wolfGuess && (
          <p className="wolf-guess-note">
            {round.winner === "wolves"
              ? `🐺 Wolf guessed "${round.wolfGuess}" — correct!`
              : `Wolf guessed "${round.wolfGuess}" — wrong!`}
          </p>
        )}
      </div>

      <div className="result-recap">
        <div className="recap-pair">
          <span className="recap-label">Villager word:</span>
          <span className="recap-word">{round.villagerWord}</span>
        </div>
        <div className="recap-pair">
          <span className="recap-label">Wolf word:</span>
          <span className="recap-word wolf-word">{round.wolfWord}</span>
        </div>
        {votedOut && (
          <div className="recap-pair">
            <span className="recap-label">Voted out:</span>
            <span className="recap-word">
              Player {votedOut.id} ({votedOut.role === "wolf" ? "🐺 Wolf" : "👤 Villager"})
            </span>
          </div>
        )}
      </div>

      <div className="role-summary">
        <div className="role-group">
          <p className="role-group-title">🐺 Wolves</p>
          {wolves.map((p) => (
            <span key={p.id} className="role-chip wolf">
              Player {p.id}
            </span>
          ))}
        </div>
        <div className="role-group">
          <p className="role-group-title">👤 Villagers</p>
          {villagers.map((p) => (
            <span key={p.id} className="role-chip villager">
              Player {p.id}
            </span>
          ))}
        </div>
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={() => dispatch({ type: "PLAY_AGAIN" })}>
          Play again (same settings)
        </button>
        <button className="btn-secondary" onClick={() => dispatch({ type: "NEW_SETUP" })}>
          Change settings
        </button>
      </div>
    </div>
  );
}
