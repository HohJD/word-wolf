import { useState, useEffect, useRef } from 'react';
import Avatar from './components/Avatar';

export default function PlayerSetup({ initial, onSave, onClose }) {
  const [names, setNames] = useState(
    initial.length > 0 ? [...initial] : ['', '', '', '']
  );
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  function update(i, val) {
    setNames(n => n.map((v, idx) => idx === i ? val : v));
  }

  function remove(i) {
    setNames(n => n.filter((_, idx) => idx !== i));
  }

  function add() {
    setNames(n => [...n, '']);
  }

  function handleSave() {
    const clean = names.map(n => n.trim()).filter(Boolean);
    onSave(clean);
  }

  const valid = names.filter(n => n.trim()).length >= 2;

  return (
    <div className="player-setup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="player-setup-sheet">
        <div className="sheet-handle" />
        <div>
          <h2 className="sheet-title">Players</h2>
          <p className="sheet-sub">Add names so every game knows who's who</p>
        </div>

        <div className="player-name-list">
          {names.map((name, i) => (
            <div key={i} className="player-name-row">
              <Avatar name={name || String(i + 1)} size={36} />
              <input
                ref={i === 0 ? firstRef : null}
                className="player-name-input"
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={e => update(i, e.target.value)}
                maxLength={20}
              />
              {names.length > 2 && (
                <button className="remove-player-btn" onClick={() => remove(i)} aria-label="Remove">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {names.length < 20 && (
          <button className="add-player-btn" onClick={add}>
            + Add player
          </button>
        )}

        <button className="btn-primary" onClick={handleSave} disabled={!valid}>
          {valid ? `Save ${names.filter(n => n.trim()).length} players` : 'Add at least 2 names'}
        </button>
        <button className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
