import { useState } from "react";

export default function VoteScreen({ state, dispatch }) {
  const { round } = state;
  const [selected, setSelected] = useState(null);

  function handleSubmit() {
    if (selected === "nobody") {
      dispatch({ type: "SKIP_VOTE" });
    } else {
      dispatch({ type: "SUBMIT_VOTE", votedOutId: selected });
    }
  }

  return (
    <div className="screen vote-screen">
      <h2 className="screen-title">Vote</h2>
      <p className="screen-sub">
        Discuss and agree — who do you think is the Wolf?
      </p>

      <div className="player-list">
        {round.players.map((p) => (
          <button
            key={p.id}
            className={`player-btn ${selected === p.id ? "selected" : ""}`}
            onClick={() => setSelected(p.id)}
          >
            <span className="player-num">Player {p.id}</span>
            {selected === p.id && <span className="check">✓</span>}
          </button>
        ))}
        <button
          className={`player-btn nobody ${selected === "nobody" ? "selected" : ""}`}
          onClick={() => setSelected("nobody")}
        >
          <span className="player-num">Nobody (wolves win)</span>
          {selected === "nobody" && <span className="check">✓</span>}
        </button>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={selected === null}
      >
        Confirm vote
      </button>
    </div>
  );
}
