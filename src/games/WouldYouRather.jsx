import { useState } from 'react';
import { prompts } from './wouldYouRatherContent';
import Avatar from '../components/Avatar';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WouldYouRather({ onBack, players }) {
  const [deck] = useState(() => shuffle(prompts));
  const [qIndex, setQIndex] = useState(0);
  // phase: 'prompt' | 'voting' | 'results'
  const [phase, setPhase] = useState('prompt');
  const [votes, setVotes] = useState({}); // { playerIndex: 'a' | 'b' }
  const [voterIdx, setVoterIdx] = useState(0);
  const [history, setHistory] = useState([]); // [{a,b}, ...]

  const prompt = deck[qIndex % deck.length];
  const hasPlayers = players.length >= 2;

  // ── voting phase helpers ─────────────────────────────
  function startVoting() {
    setPhase('voting');
    setVotes({});
    setVoterIdx(0);
  }

  function castVote(choice) {
    const newVotes = { ...votes, [voterIdx]: choice };
    setVotes(newVotes);
    const next = voterIdx + 1;
    if (next >= players.length) {
      setPhase('results');
    } else {
      setVoterIdx(next);
    }
  }

  function nextQuestion() {
    const aVotes = Object.values(votes).filter(v => v === 'a').length;
    const bVotes = Object.values(votes).filter(v => v === 'b').length;
    setHistory(h => [...h, { a: aVotes, b: bVotes }]);
    setQIndex(i => i + 1);
    setPhase('prompt');
    setVotes({});
    setVoterIdx(0);
  }

  // ── totals across history ─────────────────────────────
  const totalA = history.reduce((s, r) => s + r.a, 0);
  const totalB = history.reduce((s, r) => s + r.b, 0);
  const totalVotes = totalA + totalB || 1;

  // current round result
  const curA = Object.values(votes).filter(v => v === 'a').length;
  const curB = Object.values(votes).filter(v => v === 'b').length;
  const curTotal = curA + curB || 1;

  return (
    <div className="screen wyr-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <span className="wyr-counter">{qIndex + 1} / {deck.length}</span>
      </div>

      {/* ── PROMPT phase ── */}
      {phase === 'prompt' && (
        <>
          <div className="wyr-header">
            <p className="wyr-prompt-label">Would you rather…</p>
          </div>

          <div className="wyr-options">
            <div className="wyr-option a">
              <span className="wyr-option-letter">A</span>
              <p className="wyr-option-text">{prompt.a}</p>
            </div>
            <div className="wyr-or">OR</div>
            <div className="wyr-option b">
              <span className="wyr-option-letter">B</span>
              <p className="wyr-option-text">{prompt.b}</p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="wyr-score">
              <span className="wyr-score-item a">A: {totalA}</span>
              <span className="wyr-score-div">·</span>
              <span className="wyr-score-item b">B: {totalB}</span>
            </div>
          )}

          {hasPlayers ? (
            <button className="btn-primary" onClick={startVoting}>
              Start voting →
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setQIndex(i => i + 1)}>
              Next question →
            </button>
          )}
        </>
      )}

      {/* ── VOTING phase ── */}
      {phase === 'voting' && (
        <>
          <div className="wyr-vote-header">
            <div className="wyr-voter-avatar-row">
              <Avatar name={players[voterIdx]} size={48} />
            </div>
            <p className="wyr-vote-title">{players[voterIdx]}, pick one</p>
            <p className="wyr-vote-sub">{voterIdx + 1} of {players.length} voting</p>
          </div>

          <div className="wyr-vote-options">
            <button className="wyr-vote-card a" onClick={() => castVote('a')}>
              <span className="wyr-vote-letter">A</span>
              <p className="wyr-vote-text">{prompt.a}</p>
            </button>
            <div className="wyr-or">OR</div>
            <button className="wyr-vote-card b" onClick={() => castVote('b')}>
              <span className="wyr-vote-letter">B</span>
              <p className="wyr-vote-text">{prompt.b}</p>
            </button>
          </div>

          <div className="wyr-voter-progress">
            {players.map((p, i) => (
              <div
                key={p}
                className={`wyr-voter-dot ${
                  i < voterIdx ? 'done' : i === voterIdx ? 'current' : ''
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* ── RESULTS phase ── */}
      {phase === 'results' && (
        <>
          <div className="wyr-results-header">
            <p className="wyr-results-title">Results</p>
          </div>

          <div className="wyr-result-cards">
            <div className="wyr-result-card a">
              <p className="wyr-result-option-text">{prompt.a}</p>
              <div className="wyr-result-bar-track">
                <div
                  className="wyr-result-bar-fill a"
                  style={{ width: `${(curA / curTotal) * 100}%` }}
                />
              </div>
              <p className="wyr-result-pct">
                {curA} vote{curA !== 1 ? 's' : ''} · {Math.round((curA / curTotal) * 100)}%
              </p>
            </div>

            <div className="wyr-result-vs">VS</div>

            <div className="wyr-result-card b">
              <p className="wyr-result-option-text">{prompt.b}</p>
              <div className="wyr-result-bar-track">
                <div
                  className="wyr-result-bar-fill b"
                  style={{ width: `${(curB / curTotal) * 100}%` }}
                />
              </div>
              <p className="wyr-result-pct">
                {curB} vote{curB !== 1 ? 's' : ''} · {Math.round((curB / curTotal) * 100)}%
              </p>
            </div>
          </div>

          <div className="wyr-voters-recap">
            {players.map((p, i) => (
              <div key={p} className={`wyr-voter-chip ${votes[i]}`}>
                <Avatar name={p} size={24} />
                <span>{p}</span>
                <span className="wyr-voter-pick">{votes[i]?.toUpperCase()}</span>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={nextQuestion}>
            Next question →
          </button>
        </>
      )}
    </div>
  );
}
