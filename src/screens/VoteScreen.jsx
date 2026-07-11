import { useState } from 'react';
import Avatar from '../components/Avatar';

export default function VoteScreen({ state, dispatch, players }) {
  const { round } = state;
  const [selected, setSelected] = useState(null);

  function handleSubmit() {
    if (selected === 'nobody') dispatch({ type: 'SKIP_VOTE' });
    else dispatch({ type: 'SUBMIT_VOTE', votedOutId: selected });
  }

  function nameFor(p) {
    return players?.[p.id - 1] || `Player ${p.id}`;
  }

  return (
    <div className="screen vote-screen view-enter">
      <h2 className="screen-title">Vote</h2>
      <p className="screen-sub">Who do you think is the 🐺 Wolf?</p>

      <div className="player-list">
        {round.players.map(p => (
          <button
            key={p.id}
            className={`player-btn ${selected === p.id ? 'selected' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <Avatar name={nameFor(p)} size={34} />
            <span className="player-name">{nameFor(p)}</span>
            {selected === p.id && <span className="check">✓</span>}
          </button>
        ))}
        <button
          className={`player-btn nobody ${selected === 'nobody' ? 'selected' : ''}`}
          onClick={() => setSelected('nobody')}
        >
          <span style={{ fontSize: 22 }}>🚫</span>
          <span className="player-name">Nobody — wolves win</span>
          {selected === 'nobody' && <span className="check">✓</span>}
        </button>
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={selected === null}>
        Confirm vote
      </button>
    </div>
  );
}
