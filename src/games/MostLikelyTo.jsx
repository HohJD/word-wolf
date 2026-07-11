import { useState } from 'react';
import { prompts } from './mostLikelyToContent';
import Avatar from '../components/Avatar';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MostLikelyTo({ onBack, players }) {
  const [deck] = useState(() => shuffle(prompts));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState(() =>
    Object.fromEntries(players.map(p => [p, 0]))
  );
  const [roundWinner, setRoundWinner] = useState(null);
  const [phase, setPhase] = useState('reveal'); // 'reveal' | 'vote' | 'scored'

  const hasPlayers = players.length >= 2;
  const prompt = deck[index % deck.length];

  // sorted leaderboard
  const board = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const totalRounds = index;

  function handleReveal() {
    setRevealed(true);
    if (hasPlayers) setPhase('vote');
  }

  function vote(name) {
    setRoundWinner(name);
    setScores(s => ({ ...s, [name]: (s[name] || 0) + 1 }));
    setPhase('scored');
  }

  function next() {
    setRevealed(false);
    setRoundWinner(null);
    setIndex(i => i + 1);
    setPhase('reveal');
  }

  return (
    <div className="screen mlt-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <span className="mlt-counter">{index + 1} / {deck.length}</span>
      </div>

      {/* Leaderboard strip (only once scored) */}
      {hasPlayers && totalRounds > 0 && (
        <div className="mlt-leaderboard">
          <p className="mlt-lb-title">🏆 Leaderboard</p>
          {board.map((name, i) => (
            <div key={name} className="mlt-lb-row">
              <span className="mlt-lb-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <Avatar name={name} size={26} />
              <span className="mlt-lb-name">{name}</span>
              <span className="mlt-lb-pts">{scores[name] || 0} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="mlt-content">
        <div className="mlt-header">
          <span className="mlt-icon">👆</span>
          <p className="mlt-label">Most likely to…</p>
        </div>

        {!revealed ? (
          <button className="mlt-card-hidden" onClick={handleReveal}>
            <span className="mlt-tap-hint">Tap to reveal</span>
          </button>
        ) : (
          <div className="mlt-card">
            <p className="mlt-prompt">{prompt}</p>
          </div>
        )}

        {phase === 'reveal' && !revealed && (
          <p className="mlt-instruction">Get ready — everyone votes at the same time!</p>
        )}

        {phase === 'vote' && (
          <div className="mlt-vote-section">
            <p className="mlt-vote-title">Who is it? Tap the culprit 👇</p>
            <div className="mlt-vote-grid">
              {players.map(name => (
                <button key={name} className="mlt-vote-btn" onClick={() => vote(name)}>
                  <Avatar name={name} size={28} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'scored' && roundWinner && (
          <div className="mlt-winner-announce">
            <Avatar name={roundWinner} size={56} />
            <p className="mlt-winner-name">{roundWinner}</p>
            <p className="mlt-winner-pts">+1 point · {scores[roundWinner]} total</p>
          </div>
        )}
      </div>

      {phase === 'scored' || (!hasPlayers && revealed) ? (
        <button className="btn-primary" onClick={next}>
          Next prompt →
        </button>
      ) : phase === 'reveal' && revealed && !hasPlayers ? (
        <button className="btn-primary" onClick={next}>
          Next prompt →
        </button>
      ) : null}

      {!revealed && (
        <button className="btn-secondary" onClick={handleReveal}>
          Show prompt
        </button>
      )}
    </div>
  );
}
