import { useState, useCallback } from "react";
import { truths, dares } from "./truthOrDareContent";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TruthOrDare({ onBack }) {
  const [phase, setPhase] = useState("pick"); // 'pick' | 'truth' | 'dare'
  const [card, setCard] = useState("");
  const [deck, setDeck] = useState({ truths: shuffle(truths), dares: shuffle(dares) });
  const [counts, setCounts] = useState({ truth: 0, dare: 0 });

  const draw = useCallback(
    (type) => {
      const key = type === "truth" ? "truths" : "dares";
      const src = type === "truth" ? truths : dares;
      let remaining = deck[key];
      if (remaining.length === 0) remaining = shuffle(src);
      const [next, ...rest] = remaining;
      setDeck((d) => ({ ...d, [key]: rest }));
      setCard(next);
      setPhase(type);
      setCounts((c) => ({ ...c, [type]: c[type] + 1 }));
    },
    [deck]
  );

  return (
    <div className="screen td-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>
          ← Games
        </button>
        <div className="td-stats">
          <span>🫦 {counts.truth}</span>
          <span>🔥 {counts.dare}</span>
        </div>
      </div>

      {phase === "pick" && (
        <div className="td-pick">
          <div className="td-logo">
            <span className="td-icon">🎲</span>
            <h1 className="td-title">Truth or Dare</h1>
            <p className="td-sub">How brave are you?</p>
          </div>
          <div className="td-choices">
            <button className="td-choice truth" onClick={() => draw("truth")}>
              <span className="choice-emoji">🫦</span>
              <span className="choice-label">TRUTH</span>
            </button>
            <button className="td-choice dare" onClick={() => draw("dare")}>
              <span className="choice-emoji">🔥</span>
              <span className="choice-label">DARE</span>
            </button>
          </div>
        </div>
      )}

      {phase !== "pick" && (
        <div className="td-card-view">
          <div className={`td-card-badge ${phase}`}>
            {phase === "truth" ? "🫦 TRUTH" : "🔥 DARE"}
          </div>
          <div className="td-card-text">{card}</div>
          <div className="td-card-actions">
            <button
              className="btn-ghost"
              onClick={() => draw(phase)}
            >
              Skip ↻
            </button>
            <button className="btn-primary" onClick={() => setPhase("pick")}>
              Next round →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
