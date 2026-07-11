import { useState } from "react";
import { prompts } from "./mostLikelyToContent";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MostLikelyTo({ onBack }) {
  const [deck] = useState(() => shuffle(prompts));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const prompt = deck[index % deck.length];

  function handleReveal() {
    setRevealed(true);
  }

  function handleNext() {
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="screen mlt-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>
          ← Games
        </button>
        <span className="mlt-counter">
          {index + 1} / {deck.length}
        </span>
      </div>

      <div className="mlt-content">
        <div className="mlt-header">
          <span className="mlt-icon">👆</span>
          <p className="mlt-label">Most likely to…</p>
        </div>

        {!revealed ? (
          <button className="mlt-card-hidden" onClick={handleReveal}>
            <span className="mlt-tap-hint">Tap to reveal</span>
          </button>
        ) : (
          <div className="mlt-card">
            <p className="mlt-prompt">{prompt}</p>
          </div>
        )}

        <p className="mlt-instruction">
          {revealed
            ? "Everyone points at the person most likely to do this — majority vote wins!"
            : "Get ready — everyone votes at the same time!"}
        </p>
      </div>

      {revealed && (
        <button className="btn-primary" onClick={handleNext}>
          Next prompt →
        </button>
      )}

      {!revealed && (
        <button className="btn-secondary" onClick={handleReveal}>
          Show prompt
        </button>
      )}
    </div>
  );
}
