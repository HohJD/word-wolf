import { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';

export default function RevealScreen({ state, dispatch, players, onBack }) {
  const { round } = state;
  const player = round.players[round.revealIndex];
  const [showing, setShowing] = useState(false);
  const [autoHide, setAutoHide] = useState(null);

  const total = round.players.length;
  const current = round.revealIndex + 1;
  const playerName = players?.[player.id - 1] || `Player ${current}`;
  const nextPlayer = round.players[round.revealIndex + 1];
  const nextName = nextPlayer
    ? players?.[nextPlayer.id - 1] || `Player ${current + 1}`
    : null;

  const isBlankWolf = player.role === 'wolf' && round.wolfMode === 'blank';

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
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>🏠 Home</button>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="progress-fill" style={{ width: `${(current / total) * 100}%` }} />
        </div>
      </div>

      <div className="reveal-player-row">
        {players?.length > 0 && <Avatar name={playerName} size={32} />}
        <p className="step-label">{playerName} — {current} of {total}</p>
      </div>

      <div
        className={`word-card${isBlankWolf && showing ? ' word-card--blank-wolf' : ''}`}
        onClick={showing ? handleHide : handleReveal}
      >
        {showing ? (
          isBlankWolf ? (
            <div className="word-reveal word-reveal--blank">
              <span className="blank-wolf-icon">🐺</span>
              <p className="blank-wolf-title">You are the Wolf!</p>
              <p className="blank-wolf-sub">You have no word — listen carefully and blend in.</p>
              <p className="word-hint" style={{ marginTop: 14 }}>Tap to hide</p>
            </div>
          ) : (
            <div className="word-reveal">
              <p className="word-label">Your word is</p>
              <p className="word-text">{player.word}</p>
              <p className="word-hint">Tap to hide</p>
            </div>
          )
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
        <button className="btn-secondary" onClick={handleHide}>Hide</button>
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
