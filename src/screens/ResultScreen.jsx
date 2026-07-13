import Confetti from '../components/Confetti';
import Avatar from '../components/Avatar';

export default function ResultScreen({ state, dispatch, players, onBack }) {
  const { round } = state;
  const wolves = round.players.filter(p => p.role === 'wolf');
  const villagers = round.players.filter(p => p.role === 'villager');
  const votedOut = round.players.find(p => p.id === round.votedOutId);
  const wolvesWin = round.winner === 'wolves';

  function nameFor(p) {
    return players?.[p.id - 1] || `Player ${p.id}`;
  }

  return (
    <div className="screen result-screen view-enter">
      {!wolvesWin && <Confetti />}

      <div className={`result-banner ${wolvesWin ? 'wolves-win' : 'villagers-win'}`}>
        <div className="result-icon">{wolvesWin ? '🐺' : '🏡'}</div>
        <h1 className="result-title">{wolvesWin ? 'Wolves Win!' : 'Villagers Win!'}</h1>
        {round.wolfGuess && (
          <p className="wolf-guess-note">
            {round.winner === 'wolves'
              ? `🐺 Wolf guessed "${round.wolfGuess}" — correct!`
              : `Wolf guessed "${round.wolfGuess}" — wrong!`}
          </p>
        )}
      </div>

      <div className="result-recap">
        <div className="recap-pair">
          <span className="recap-label">Villager word</span>
          <span className="recap-word">{round.villagerWord}</span>
        </div>
        <div className="recap-pair">
          <span className="recap-label">Wolf word</span>
          <span className="recap-word wolf-word">{round.wolfWord}</span>
        </div>
        {votedOut && (
          <div className="recap-pair">
            <span className="recap-label">Voted out</span>
            <span className="recap-word">
              {nameFor(votedOut)} {votedOut.role === 'wolf' ? '🐺' : '👤'}
            </span>
          </div>
        )}
      </div>

      <div className="role-summary">
        <div className="role-group">
          <p className="role-group-title">🐺 Wolves</p>
          {wolves.map(p => (
            <div key={p.id} className="role-chip-row">
              <Avatar name={nameFor(p)} size={24} />
              <span className="role-chip wolf">{nameFor(p)}</span>
            </div>
          ))}
        </div>
        <div className="role-group">
          <p className="role-group-title">👤 Villagers</p>
          {villagers.map(p => (
            <div key={p.id} className="role-chip-row">
              <Avatar name={nameFor(p)} size={24} />
              <span className="role-chip villager">{nameFor(p)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={() => dispatch({ type: 'PLAY_AGAIN' })}>
          Play again (same settings)
        </button>
        <button className="btn-secondary" onClick={() => dispatch({ type: 'NEW_SETUP' })}>
          Change settings
        </button>
        <button className="btn-ghost" onClick={onBack}>
          🏠 Home
        </button>
      </div>
    </div>
  );
}
