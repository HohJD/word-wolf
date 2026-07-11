import { useState } from "react";
import { prompts } from "./wouldYouRatherContent";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WouldYouRather({ onBack }) {
  const [deck] = useState(() => shuffle(prompts));
  const [index, setIndex] = useState(0);
  const [vote, setVote] = useState(null); // 'a' | 'b' | null
  const [history, setHistory] = useState([]); // [{ prompt, vote }]

  const prompt = deck[index % deck.length];
  const total = deck.length;

  function handleVote(choice) {
    setVote(choice);
  }

  function handleNext() {
    setHistory((h) => [...h, { prompt, vote }]);
    setVote(null);
    setIndex((i) => i + 1);
  }

  const aCount = history.filter((h) => h.vote === "a").length;
  const bCount = history.filter((h) => h.vote === "b").length;

  return (
    <div className="screen wyr-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>
          ← Games
        </button>
        <span className="wyr-counter">
          {index + 1} / {total}
        </span>
      </div>

      <div className="wyr-header">
        <p className="wyr-prompt-label">Would you rather…</p>
      </div>

      <div className="wyr-options">
        <button
          className={`wyr-option a ${vote === "a" ? "chosen" : ""}`}
          onClick={() => handleVote("a")}
        >
          <span className="wyr-option-letter">A</span>
          <p className="wyr-option-text">{prompt.a}</p>
          {vote === "a" && <span className="wyr-check">✓</span>}
        </button>

        <div className="wyr-or">OR</div>

        <button
          className={`wyr-option b ${vote === "b" ? "chosen" : ""}`}
          onClick={() => handleVote("b")}
        >
          <span className="wyr-option-letter">B</span>
          <p className="wyr-option-text">{prompt.b}</p>
          {vote === "b" && <span className="wyr-check">✓</span>}
        </button>
      </div>

      {history.length > 0 && (
        <div className="wyr-score">
          <span className="wyr-score-item a">A: {aCount}</span>
          <span className="wyr-score-div">·</span>
          <span className="wyr-score-item b">B: {bCount}</span>
        </div>
      )}

      <button className="btn-primary" onClick={handleNext}>
        {vote ? "Next question →" : "Skip →"}
      </button>
    </div>
  );
}
