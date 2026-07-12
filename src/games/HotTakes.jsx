import { useState } from 'react';
import { prompts } from './hotTakesContent';
import GameHeader from '../components/GameHeader';
import PlayerSpinner from '../components/PlayerSpinner';
import Avatar from '../components/Avatar';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HotTakes({ onBack, players }) {
  const [deck] = useState(() => shuffle(prompts));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('reveal'); // reveal, spin, vote, result
  const [defender, setDefender] = useState(null);
  const [votes, setVotes] = useState({}); // { playerIndex: 'hot' | 'cold' }
  const [voterIdx, setVoterIdx] = useState(0);
  const [scores, setScores] = useState(() => Object.fromEntries(players.map(p => [p, 0])));
  const [spinKey, setSpinKey] = useState(0);

  const hasPlayers = players.length >= 2;
  const prompt = deck[index % deck.length];

  const hotVotes = Object.values(votes).filter(v => v === 'hot').length;
  const coldVotes = Object.values(votes).filter(v => v === 'cold').length;
  const totalVotes = hotVotes + coldVotes;
  const hotPct = totalVotes ? Math.round((hotVotes / totalVotes) * 100) : 0;

  function handleReveal() {
    if (hasPlayers) {
      setPhase('spin');
    } else {
      setPhase('result');
    }
  }

  function castVote(choice) {
    const nextVotes = { ...votes, [voterIdx]: choice };
    setVotes(nextVotes);
    const next = voterIdx + 1;
    if (next >= players.length) {
      const hot = Object.values(nextVotes).filter(v => v === 'hot').length;
      const cold = Object.values(nextVotes).filter(v => v === 'cold').length;
      if (hot > cold && defender) {
        setScores(s => ({ ...s, [defender]: (s[defender] || 0) + 1 }));
      }
      setPhase('result');
    } else {
      setVoterIdx(next);
    }
  }

  function nextTake() {
    setIndex(i => i + 1);
    setPhase('reveal');
    setDefender(null);
    setVotes({});
    setVoterIdx(0);
    setSpinKey(k => k + 1);
  }

  const board = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

  return (
    <div className="screen ht-screen view-enter">
      <GameHeader
        onBack={onBack}
        title="Hot Takes"
        subtitle="Defend the unpopular opinion"
        icon="🔥"
      />

      {hasPlayers && (
        <div className="ht-leaderboard">
          {board.slice(0, 3).map((name, i) => (
            <div key={name} className="ht-lb-row">
              <span className="ht-lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              <Avatar name={name} size={22} />
              <span className="ht-lb-name">{name}</span>
              <span className="ht-lb-pts">{scores[name] || 0} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="ht-content">
        {phase === 'reveal' && (
          <button className="ht-card-hidden" onClick={handleReveal}>
            <span className="ht-tap-hint">Tap to reveal hot take</span>
          </button>
        )}

        {(phase === 'spin' || phase === 'vote' || phase === 'result') && (
          <div className="ht-card">
            <p className="ht-prompt">{prompt}</p>
          </div>
        )}

        {phase === 'spin' && hasPlayers && (
          <div className="ht-spin-section">
            <p className="ht-spin-label">Who has to defend this take?</p>
            <PlayerSpinner
              key={spinKey}
              players={players}
              size={110}
              onComplete={name => { setDefender(name); setPhase('vote'); }}
            />
          </div>
        )}

        {phase === 'vote' && (
          <div className="ht-vote-section">
            <div className="ht-vote-header">
              <Avatar name={players[voterIdx]} size={40} />
              <p className="ht-vote-title">{players[voterIdx]}, is this take hot or cold?</p>
              <p className="ht-vote-sub">{voterIdx + 1} of {players.length} voting</p>
            </div>
            <div className="ht-vote-buttons">
              <button className="ht-vote-btn hot" onClick={() => castVote('hot')}>🔥 Hot</button>
              <button className="ht-vote-btn cold" onClick={() => castVote('cold')}>❄️ Cold</button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="ht-result-section">
            {defender && (
              <div className="ht-result-defender">
                <Avatar name={defender} size={44} />
                <span>{defender} defended it</span>
              </div>
            )}
            <div className="ht-result-bar-track">
              <div className="ht-result-bar-fill" style={{ width: `${hotPct}%` }} />
            </div>
            <p className="ht-result-stats">
              🔥 {hotVotes} hot · ❄️ {coldVotes} cold
            </p>
            {defender && (
              <p className="ht-result-bonus">
                {hotVotes > coldVotes ? `+1 point for ${defender}` : 'No points this round'}
              </p>
            )}
            <button className="btn-primary" onClick={nextTake}>Next take →</button>
          </div>
        )}
      </div>

      {phase === 'spin' && (
        <button className="btn-secondary" onClick={() => setPhase('vote')}>Skip spin — everyone votes</button>
      )}
    </div>
  );
}
