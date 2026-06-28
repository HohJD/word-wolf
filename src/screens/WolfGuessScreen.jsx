import { useState } from "react";

export default function WolfGuessScreen({ state, dispatch }) {
  const { round } = state;
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  const [guess, setGuess] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!guess.trim()) return;
    dispatch({ type: "SUBMIT_WOLF_GUESS", guess: guess.trim() });
  }

  return (
    <div className="screen wolf-guess-screen">
      <div className="wolf-moment">
        <span className="big-wolf">🐺</span>
        <h2>Wolf's Last Chance</h2>
        <p>
          Player {votedOut?.id} — you were caught. Guess the Villagers' word to steal the win!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="guess-form">
        <input
          className="guess-input"
          type="text"
          placeholder="Your guess…"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={!guess.trim()}>
          Submit guess
        </button>
      </form>

      <p className="guess-hint">
        One guess only. Think carefully!
      </p>
    </div>
  );
}
