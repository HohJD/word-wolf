import { useState, useEffect } from "react";

export default function RevealScreen({ state, dispatch }) {
  const { round } = state;
  const player = round.players[round.revealIndex];
  const [showing, setShowing] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState(null);

  const total = round.players.length;
  const current = round.revealIndex + 1;

  useEffect(() => {
    setShowing(false);
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.revealIndex]);

  function handleReveal() {
    setShowing(true);
    const t = setTimeout(() => setShowing(false), 6000);
    setAutoHideTimer(t);
  }

  function handleHide() {
    setShowing(false);
    if (autoHideTimer) clearTimeout(autoHideTimer);
  }

  function handleNext() {
    dispatch({ type: "REVEAL_NEXT" });
  }

  return (
    <div className="screen reveal-screen">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <p className="step-label">
        Player {current} of {total}
      </p>

      <div className="word-card" onClick={showing ? handleHide : handleReveal}>
        {showing ? (
          <div className="word-reveal">
            <p className="word-label">Your word is</p>
            <p className="word-text">{player.word}</p>
            <p className="word-hint">Tap to hide</p>
          </div>
        ) : (
          <div className="word-hidden">
            <span className="eye-icon">👁</span>
            <p className="tap-hint">Tap to reveal</p>
            <p className="pass-text">
              {current < total
                ? `Player ${current}, look only at this screen`
                : "Last player — then pass back to host"}
            </p>
          </div>
        )}
      </div>

      {showing && (
        <button className="btn-secondary" onClick={handleHide}>
          Hide word
        </button>
      )}

      {!showing && (
        <button className="btn-primary" onClick={handleNext}>
          {current < total ? `Pass to Player ${current + 1}` : "Everyone's seen their word →"}
        </button>
      )}

      <p className="privacy-note">
        Do not reveal your word or role to anyone
      </p>
    </div>
  );
}
