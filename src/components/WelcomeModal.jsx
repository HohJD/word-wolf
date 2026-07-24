import { useEffect, useState } from 'react';

const STEPS = [
  {
    icon: '👫',
    title: 'Add your players',
    text: 'Tap the player row at the top to enter names. All games use this list.',
  },
  {
    icon: '🎮',
    title: 'Pick a game',
    text: 'Choose a live game card. Each one has simple pass-the-phone play.',
  },
  {
    icon: '📱',
    title: 'Pass and play',
    text: 'Follow the prompts on screen. Tap the ? button anytime for rules.',
  },
];

export default function WelcomeModal({ open, onClose, onOpenPlayers }) {
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose(dontShow);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dontShow]);

  if (!open) return null;

  function handleClose() {
    onClose(dontShow);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal-card welcome-modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">🎉</span>
            <h2 className="modal-title">Welcome to Party Multiplayer Games</h2>
          </div>
        </div>

        <p className="welcome-sub">No sign-up, no scoresheets — just party games on one phone.</p>

        <div className="welcome-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="welcome-step">
              <span className="welcome-step-icon">{step.icon}</span>
              <div className="welcome-step-body">
                <p className="welcome-step-title">{step.title}</p>
                <p className="welcome-step-text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onOpenPlayers}>
          Add players to start
        </button>
        <button className="btn-secondary" onClick={handleClose}>
          Explore games first
        </button>

        <label className="welcome-toggle">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={e => setDontShow(e.target.checked)}
          />
          <span>Don't show this again</span>
        </label>
      </div>
    </div>
  );
}
