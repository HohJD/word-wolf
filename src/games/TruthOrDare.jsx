import { useState, useCallback } from 'react';
import { content } from './truthOrDareContent';
import Avatar from '../components/Avatar';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFFICULTIES = [
  { key: 'mild', label: '🌿 Mild', color: '#34d399', cls: 'active-mild' },
  { key: 'spicy', label: '🌶️ Spicy', color: '#fbbf24', cls: 'active-spicy' },
  { key: 'wild', label: '🔥 Wild', color: '#fb7185', cls: 'active-wild' },
];

export default function TruthOrDare({ onBack, players }) {
  const [difficulty, setDifficulty] = useState('spicy');
  const [phase, setPhase] = useState('pick'); // 'pick' | 'truth' | 'dare'
  const [card, setCard] = useState('');
  const [playerIdx, setPlayerIdx] = useState(0);
  const [counts, setCounts] = useState({ truth: 0, dare: 0 });
  const [decks, setDecks] = useState({
    mild:  { truths: shuffle(content.mild.truths),  dares: shuffle(content.mild.dares) },
    spicy: { truths: shuffle(content.spicy.truths), dares: shuffle(content.spicy.dares) },
    wild:  { truths: shuffle(content.wild.truths),  dares: shuffle(content.wild.dares) },
  });

  const currentPlayer = players.length > 0 ? players[playerIdx % players.length] : null;

  const draw = useCallback((type) => {
    const src = content[difficulty][type === 'truth' ? 'truths' : 'dares'];
    const key = `${difficulty}-${type}s`;
    setDecks(prev => {
      const deck = prev[difficulty][type === 'truth' ? 'truths' : 'dares'];
      const remaining = deck.length > 0 ? deck : shuffle(src);
      const [next, ...rest] = remaining;
      setCard(next);
      return {
        ...prev,
        [difficulty]: {
          ...prev[difficulty],
          [type === 'truth' ? 'truths' : 'dares']: rest,
        },
      };
    });
    setPhase(type);
    setCounts(c => ({ ...c, [type]: c[type] + 1 }));
  }, [difficulty]);

  function nextRound() {
    if (players.length > 0) setPlayerIdx(i => i + 1);
    setPhase('pick');
  }

  const diff = DIFFICULTIES.find(d => d.key === difficulty);

  return (
    <div className="screen td-screen view-enter">
      <div className="game-topbar">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <div className="td-stats">
          <span>🫦 {counts.truth}</span>
          <span>🔥 {counts.dare}</span>
        </div>
      </div>

      {/* Difficulty selector — always visible */}
      <div className="td-difficulty-row">
        {DIFFICULTIES.map(d => (
          <button
            key={d.key}
            className={`td-diff-btn ${difficulty === d.key ? d.cls : ''}`}
            onClick={() => { setDifficulty(d.key); setPhase('pick'); }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {phase === 'pick' && (
        <div className="td-pick">
          <div className="td-logo">
            <span className="td-icon">🎲</span>
            <h1 className="td-title">Truth or Dare</h1>
            {currentPlayer ? (
              <div className="td-turn-wrap">
                <Avatar name={currentPlayer} size={32} />
                <span className="td-turn-name">{currentPlayer}'s turn</span>
              </div>
            ) : (
              <p className="td-sub">How brave are you?</p>
            )}
          </div>

          <div className="td-choices">
            <button className="td-choice truth" onClick={() => draw('truth')}>
              <span className="choice-emoji">🫦</span>
              <span className="choice-label">TRUTH</span>
            </button>
            <button className="td-choice dare" onClick={() => draw('dare')}>
              <span className="choice-emoji">🔥</span>
              <span className="choice-label">DARE</span>
            </button>
          </div>
        </div>
      )}

      {phase !== 'pick' && (
        <div className="td-card-view">
          {currentPlayer && (
            <div className="td-card-player">
              <Avatar name={currentPlayer} size={28} />
              <span>{currentPlayer}</span>
            </div>
          )}
          <div className={`td-card-badge ${phase}`}>
            {phase === 'truth' ? '🫦 TRUTH' : '🔥 DARE'}
          </div>
          <p className="td-card-text">{card}</p>
          <div className="td-card-actions">
            <button className="btn-ghost" onClick={() => draw(phase)}>
              Skip ↻
            </button>
            <button className="btn-primary" onClick={nextRound}>
              {currentPlayer && players.length > 1
                ? `Next — ${players[(playerIdx + 1) % players.length]}'s turn →`
                : 'Next round →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
