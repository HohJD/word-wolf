import { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';

export default function RevealScreen({ state, dispatch, players }) {
  const { round } = state;
  const player = round.players[round.revealIndex];
  const [showing, setShowing] = useState(false);
  const [autoHide, setAutoHide] = useState(null);

  const total = round.players.length;
  const current = round.revealIndex + 1;
  const playerName = players?.[player.id - 1] || `Player ${current}`;
  const nextName = players?.[round.players[round.revealIndex + 1]?.id - 1] || `Player ${current + 1}`;

  useEffect(() => {
    setShowing(false);
    return () => { if (autoHide) clearTimeout(autoHide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.revealIndex]);

  function handleReveal() {
    setShowing(true);
    const t = setTimeout(() => setShowing(false), 6000);
    setAutoHide(t);
  }

  function handleHide() {
    setShowing(false);
    if (autoHide) clearTimeout(autoHide);
  }

  return (
    <div className="screen reveal-screen view-enter">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(current / total) * 100}%` }} />
      </div>

      <div className="reveal-player-row">
        {players?.length > 0 && <Avatar name={playerName} size={32} />}
        <p className="step-label">{playerName} — {current} of {total}</p>
      </div>

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
                ? `${playerName}, look only at this screen`
                : 'Last player — pass back to host'}
            </p>
          </div>
        )}
      </div>

      {showing && (
        <button className="btn-secondary" onClick={handleHide}>Hide word</button>
      )}
      {!showing && (
        <button className="btn-primary" onClick={() => dispatch({ type: 'REVEAL_NEXT' })}>
          {current < total ? `Pass to ${nextName} →` : "Everyone's seen their word →"}
        </button>
      )}

      <p className="privacy-note">Don't reveal your word or role to anyone</p>
    </div>
  );
}
