import { getCategories } from "../wordPairs";

const TIMER_PRESETS = [
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
];

function suggestWolves(playerCount) {
  if (playerCount <= 8) return 1;
  if (playerCount <= 12) return 2;
  return 2;
}

export default function SetupScreen({ state, dispatch, onBack }) {
  const { config } = state;
  const categories = getCategories();

  function update(key, val) {
    dispatch({ type: "SET_CONFIG", key, val });
  }

  const maxWolves = Math.max(1, Math.floor(config.playerCount / 2) - 1);
  const wolvesWarning = config.wolfCount >= Math.floor(config.playerCount / 2);

  return (
    <div className="screen setup-screen view-enter">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          ← Games
        </button>
      )}

      <div className="logo">
        <span className="wolf-icon">🐺</span>
        <h1>Word Wolf</h1>
        <p className="tagline">ワードウルフ</p>
      </div>

      <div className="card">
        {/* Players */}
        <div className="field">
          <label>Players</label>
          <div className="stepper">
            <button
              className="step-btn"
              onClick={() => update("playerCount", Math.max(3, config.playerCount - 1))}
            >
              −
            </button>
            <span className="step-val">{config.playerCount}</span>
            <button
              className="step-btn"
              onClick={() => update("playerCount", Math.min(20, config.playerCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* Wolves */}
        <div className="field">
          <label>
            Wolves
            {wolvesWarning && <span className="warning-badge"> ⚠ too many</span>}
          </label>
          <div className="stepper">
            <button
              className="step-btn"
              onClick={() => update("wolfCount", Math.max(1, config.wolfCount - 1))}
            >
              −
            </button>
            <span className="step-val">{config.wolfCount}</span>
            <button
              className="step-btn"
              onClick={() => update("wolfCount", Math.min(maxWolves, config.wolfCount + 1))}
            >
              +
            </button>
          </div>
          <span className="hint">
            Suggested: {suggestWolves(config.playerCount)} for {config.playerCount} players
          </span>
        </div>

        {/* Category */}
        <div className="field">
          <label>Category</label>
          <select
            value={config.category}
            onChange={(e) => update("category", e.target.value)}
            className="select"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Timer */}
        <div className="field">
          <label>Discussion time</label>
          <div className="pill-row">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.seconds}
                className={`pill ${config.timerSeconds === p.seconds ? "active" : ""}`}
                onClick={() => update("timerSeconds", p.seconds)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wolf card mode */}
        <div className="field">
          <label>Wolf's card</label>
          <div className="wolf-mode-row">
            <button
              className={`wolf-mode-btn ${config.wolfMode === "word" ? "active" : ""}`}
              onClick={() => update("wolfMode", "word")}
            >
              <span className="wolf-mode-icon">📝</span>
              <span className="wolf-mode-label">Different word</span>
              <span className="wolf-mode-desc">Wolf sees a related but different word</span>
            </button>
            <button
              className={`wolf-mode-btn ${config.wolfMode === "blank" ? "active" : ""}`}
              onClick={() => update("wolfMode", "blank")}
            >
              <span className="wolf-mode-icon">⬜</span>
              <span className="wolf-mode-label">Blank card</span>
              <span className="wolf-mode-desc">Wolf sees nothing — must bluff!</span>
            </button>
          </div>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={() => dispatch({ type: "START_GAME" })}
        disabled={config.playerCount < 3}
      >
        Start Game
      </button>
    </div>
  );
}
