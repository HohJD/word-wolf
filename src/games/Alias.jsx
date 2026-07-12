import { useState, useEffect, useCallback } from 'react';
import { cards } from './aliasContent';
import GameHeader from '../components/GameHeader';
import Avatar from '../components/Avatar';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TIMER_SECONDS = 60;

export default function Alias({ onBack, players }) {
  const [deck] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [clueGiverIndex, setClueGiverIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready, playing, paused, roundEnd
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [correctCount, setCorrectCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const hasPlayers = players.length >= 2;
  const currentCard = deck[index % deck.length];
  const clueGiver = players[clueGiverIndex % players.length] || 'Player';

  const tick = useCallback(() => {
    setTimeLeft(t => {
      if (t <= 1) {
        setPhase('roundEnd');
        return 0;
      }
      return t - 1;
    });
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  function startRound() {
    setTimeLeft(TIMER_SECONDS);
    setCorrectCount(0);
    setSkippedCount(0);
    setPhase('playing');
  }

  function markCorrect() {
    setScore(s => s + 1);
    setCorrectCount(c => c + 1);
    setIndex(i => i + 1);
  }

  function skipWord() {
    setSkippedCount(s => s + 1);
    setIndex(i => i + 1);
  }

  function nextClueGiver() {
    setClueGiverIndex(i => i + 1);
    setPhase('ready');
  }

  const pct = timeLeft / TIMER_SECONDS;
  const urgent = timeLeft <= 10;

  return (
    <div className="screen alias-screen view-enter">
      <GameHeader
        onBack={onBack}
        title="Alias"
        subtitle="Describe without the taboo words"
        icon="🗣️"
        activePlayer={clueGiver}
      />

      <div className="alias-stats">
        <div className="alias-stat">
          <span className="alias-stat-label">Score</span>
          <span className="alias-stat-val">{score}</span>
        </div>
        <div className="alias-stat">
          <span className="alias-stat-label">Time</span>
          <span className={`alias-stat-val ${urgent ? 'urgent' : ''}`}>{timeLeft}s</span>
        </div>
        <div className="alias-stat">
          <span className="alias-stat-label">Round</span>
          <span className="alias-stat-val">{correctCount}</span>
        </div>
      </div>

      {phase === 'ready' && (
        <div className="alias-ready">
          <div className="alias-ready-avatar">
            <Avatar name={clueGiver} size={80} />
          </div>
          <p className="alias-ready-title">{clueGiver} is giving clues</p>
          <p className="alias-ready-sub">{hasPlayers ? 'Pass the phone to the clue giver' : 'Tap start when you are ready'}</p>
          <button className="btn-primary" onClick={startRound}>Start round</button>
        </div>
      )}

      {(phase === 'playing' || phase === 'paused' || phase === 'roundEnd') && (
        <>
          <div className="alias-card">
            <p className="alias-word">{currentCard.word}</p>
            <div className="alias-taboo">
              {currentCard.taboo.map(t => (
                <span key={t} className="alias-taboo-word">{t}</span>
              ))}
            </div>
            <div className={`alias-timer-bar ${urgent ? 'urgent' : ''}`}>
              <div className="alias-timer-fill" style={{ width: `${pct * 100}%` }} />
            </div>
          </div>

          {phase === 'roundEnd' ? (
            <div className="alias-round-end">
              <p className="alias-round-title">Time's up!</p>
              <p className="alias-round-summary">{correctCount} correct · {skippedCount} skipped</p>
              <button className="btn-primary" onClick={nextClueGiver}>Next clue giver →</button>
            </div>
          ) : (
            <div className="alias-actions">
              <button className="btn-primary" onClick={markCorrect}>✓ Got it!</button>
              <button className="btn-secondary" onClick={skipWord} disabled={phase === 'paused'}>Skip</button>
              <button className="btn-ghost" onClick={() => setPhase(phase === 'paused' ? 'playing' : 'paused')}>
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'playing' && (
        <div className="alias-hint">Tap the word when the team guesses it correctly</div>
      )}
    </div>
  );
}
