import Avatar from '../../components/Avatar';
import GameHeader from '../../components/GameHeader';
import {
  werewolfCount, goodSpecialBudget, roleName, roleDesc, teamName, getKnowledge, livingByRole,
} from './engine';

const OPTIONAL_ROLES = [
  { key: 'seer', label: 'Seer', desc: 'Each night, checks one player to see if they’re a Werewolf.' },
  { key: 'doctor', label: 'Doctor', desc: 'Each night, protects one player from being killed.' },
  { key: 'hunter', label: 'Hunter', desc: 'If eliminated, immediately takes one more player down too.' },
  { key: 'witch', label: 'Witch', desc: 'Has one save potion and one kill potion, usable once each.' },
];

function teamClass(team) {
  return team === 'good' ? 'ww-good' : 'ww-evil';
}

export function Lobby({ state, dispatch, onBack }) {
  const { playerCount, names, roles, error } = state;
  const wolves = werewolfCount(playerCount);
  const budget = goodSpecialBudget(playerCount);
  const used = OPTIONAL_ROLE_KEYS_COUNT(roles);

  return (
    <div className="screen ww-screen ww-lobby view-enter">
      <div className="ww-hero">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <span className="ww-moon">🌕</span>
        <h1 className="ww-title">Werewolves</h1>
        <p className="ww-subtitle">Some players are secretly Werewolves. Find them before it’s too late.</p>
      </div>

      <div className="ww-card">
        <div className="ww-field">
          <label>Players</label>
          <div className="ww-stepper">
            <button onClick={() => dispatch({ type: 'SET_PLAYER_COUNT', count: playerCount - 1 })}>−</button>
            <span>{playerCount}</span>
            <button onClick={() => dispatch({ type: 'SET_PLAYER_COUNT', count: playerCount + 1 })}>+</button>
          </div>
        </div>

        <div className="ww-field">
          <label>Names</label>
          <div className="ww-names">
            {names.map((name, i) => (
              <input
                key={i}
                className="ww-input"
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => dispatch({ type: 'SET_NAME', index: i, name: e.target.value })}
                maxLength={20}
              />
            ))}
          </div>
        </div>

        <div className="ww-field">
          <label>Optional Roles</label>
          <p className="ww-note">The rest of the good players are plain Villagers.</p>
          <div className="ww-toggle-list">
            {OPTIONAL_ROLES.map((r) => {
              const active = roles[r.key];
              const disabled = !active && used + 1 > budget;
              return (
                <button
                  key={r.key}
                  className={`ww-toggle-row ${active ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'TOGGLE_ROLE', role: r.key })}
                >
                  <span className={`ww-toggle-box ${active ? 'on' : ''}`}>{active ? '✓' : ''}</span>
                  <span className="ww-toggle-copy">
                    <span className="ww-toggle-name">{r.label}</span>
                    <span className="ww-toggle-desc">{r.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ww-balance">
          <span className="ww-good">Good {playerCount - wolves}</span>
          <span className="ww-vs">vs</span>
          <span className="ww-evil">Werewolves {wolves}</span>
        </div>

        {error && <p className="ww-error">{error}</p>}
      </div>

      <button className="btn-primary ww-start" onClick={() => dispatch({ type: 'START_GAME' })}>
        Start Game
      </button>
    </div>
  );
}

function OPTIONAL_ROLE_KEYS_COUNT(roles) {
  return ['seer', 'doctor', 'hunter', 'witch'].filter((k) => roles[k]).length;
}

export function Reveal({ state, dispatch }) {
  const { players, revealIndex, revealMode } = state;
  const player = players[revealIndex];
  const knowledge = getKnowledge(player, players);

  return (
    <div className="screen ww-screen ww-reveal view-enter">
      <div className="ww-reveal-card">
        <span className="ww-reveal-num">{revealIndex + 1} / {players.length}</span>
        {revealMode === 'pass' ? (
          <>
            <p className="ww-reveal-pass">Pass the device to</p>
            <h2 className="ww-reveal-name">{player.name}</h2>
            <Avatar name={player.name} size={80} />
            <p className="ww-reveal-instr">Make sure no one else can see the screen, then tap to reveal.</p>
            <button className="btn-primary ww-reveal-btn" onClick={() => dispatch({ type: 'CONFIRM_REVEAL' })}>
              Reveal role
            </button>
          </>
        ) : (
          <>
            <p className={`ww-team ${teamClass(player.team)}`}>{teamName(player.team)}</p>
            <h2 className="ww-reveal-name">{roleName(player.role)}</h2>
            <p className="ww-role-desc">{roleDesc(player.role)}</p>
            {knowledge && (
              <div className="ww-knowledge">
                <p className="ww-knowledge-text">{knowledge.text}</p>
                {knowledge.players.length > 0 && (
                  <div className="ww-known-list">
                    {knowledge.players.map((p) => (
                      <div key={p.id} className="ww-known">
                        <Avatar name={p.name} size={28} />
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button className="btn-primary ww-reveal-btn" onClick={() => dispatch({ type: 'HIDE_REVEAL' })}>
              {revealIndex + 1 >= players.length ? 'Hide & Begin the Night' : 'Hide & pass on'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RoundBadge({ round }) {
  return <div className="ww-round-badge">Night {round}</div>;
}

export function NightWolves({ state, dispatch, onBack }) {
  const { players, round } = state;
  const targets = players.filter((p) => p.alive && p.role !== 'werewolf');

  return (
    <div className="screen ww-screen ww-night view-enter">
      <GameHeader onBack={onBack} title="The Werewolves Wake" icon="🌕" />
      <RoundBadge round={round} />
      <p className="ww-night-prompt">Werewolves, silently agree on a victim together, then choose:</p>
      <div className="ww-target-list">
        {targets.map((p) => (
          <button key={p.id} className="ww-target" onClick={() => dispatch({ type: 'WOLF_PICK', id: p.id })}>
            <Avatar name={p.name} size={36} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NightSeer({ state, dispatch, onBack }) {
  const { players, seerResult, seerRevealed } = state;
  const seer = livingByRole(players, 'seer');
  const targets = players.filter((p) => p.alive && p.id !== seer.id);

  if (!seerRevealed) {
    return (
      <div className="screen ww-screen ww-night view-enter">
        <GameHeader onBack={onBack} title="The Seer Wakes" icon="🔮" />
        <p className="ww-night-prompt">Pass to {seer.name}. Choose a player to check.</p>
        <div className="ww-target-list">
          {targets.map((p) => (
            <button key={p.id} className="ww-target" onClick={() => dispatch({ type: 'SEER_PICK', id: p.id })}>
              <Avatar name={p.name} size={36} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen ww-screen ww-night ww-night-center view-enter">
      <GameHeader onBack={onBack} title="The Seer Wakes" icon="🔮" />
      <div className="ww-seer-result">
        <Avatar name={seerResult.name} size={64} />
        <p className="ww-seer-result-name">{seerResult.name}</p>
        <p className={`ww-seer-result-verdict ${seerResult.isWerewolf ? 'evil' : 'good'}`}>
          {seerResult.isWerewolf ? 'IS a Werewolf' : 'is NOT a Werewolf'}
        </p>
      </div>
      <button className="btn-primary ww-action" onClick={() => dispatch({ type: 'SEER_CONTINUE' })}>
        Hide & continue
      </button>
    </div>
  );
}

export function NightDoctor({ state, dispatch, onBack }) {
  const { players } = state;
  const doctor = livingByRole(players, 'doctor');
  const targets = players.filter((p) => p.alive);

  return (
    <div className="screen ww-screen ww-night view-enter">
      <GameHeader onBack={onBack} title="The Doctor Wakes" icon="⚕️" />
      <p className="ww-night-prompt">Pass to {doctor.name}. Choose a player to protect tonight.</p>
      <div className="ww-target-list">
        {targets.map((p) => (
          <button key={p.id} className="ww-target" onClick={() => dispatch({ type: 'DOCTOR_PICK', id: p.id })}>
            <Avatar name={p.name} size={36} />
            <span>{p.name}{p.id === doctor.id ? ' (yourself)' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NightWitch({ state, dispatch, onBack }) {
  const { players, nightVictim, witchHealUsed, witchPoisonUsed, witchHealChoice, witchPoisonChoice } = state;
  const witch = livingByRole(players, 'witch');
  const victim = players.find((p) => p.id === nightVictim);
  const poisonTargets = players.filter((p) => p.alive && p.id !== witch.id);

  return (
    <div className="screen ww-screen ww-night view-enter">
      <GameHeader onBack={onBack} title="The Witch Wakes" icon="🧪" />
      <p className="ww-night-prompt">Pass to {witch.name}.</p>

      {!witchHealUsed && victim && (
        <div className="ww-witch-block">
          <p className="ww-witch-label">The Werewolves targeted <strong>{victim.name}</strong>.</p>
          <button
            className={`ww-toggle-row ${witchHealChoice ? 'on' : ''}`}
            onClick={() => dispatch({ type: 'WITCH_TOGGLE_HEAL' })}
          >
            <span className={`ww-toggle-box ${witchHealChoice ? 'on' : ''}`}>{witchHealChoice ? '✓' : ''}</span>
            <span className="ww-toggle-copy">
              <span className="ww-toggle-name">Use Healing Potion</span>
              <span className="ww-toggle-desc">Saves {victim.name} from tonight’s attack.</span>
            </span>
          </button>
        </div>
      )}

      {!witchPoisonUsed && (
        <div className="ww-witch-block">
          <p className="ww-witch-label">Use your Poison Potion? (optional, once per game)</p>
          <div className="ww-target-list">
            {poisonTargets.map((p) => (
              <button
                key={p.id}
                className={`ww-target ${witchPoisonChoice === p.id ? 'selected' : ''}`}
                onClick={() => dispatch({ type: 'WITCH_SET_POISON', id: p.id })}
              >
                <Avatar name={p.name} size={32} />
                <span>{p.name}</span>
                {witchPoisonChoice === p.id && <span className="ww-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary ww-action" onClick={() => dispatch({ type: 'WITCH_CONFIRM' })}>
        Confirm & continue
      </button>
    </div>
  );
}

function HunterRevenge({ state, dispatch, hunterName }) {
  const targets = state.players.filter((p) => p.alive);
  return (
    <div className="ww-hunter-block">
      <span className="ww-hunter-icon">🏹</span>
      <p className="ww-hunter-prompt">{hunterName} was the Hunter! Choose one more player to take down.</p>
      <div className="ww-target-list">
        {targets.map((p) => (
          <button key={p.id} className="ww-target" onClick={() => dispatch({ type: 'HUNTER_REVENGE', id: p.id })}>
            <Avatar name={p.name} size={32} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DayReveal({ state, dispatch, onBack }) {
  const { nightDeaths, hunterPending, round } = state;
  const hunter = hunterPending != null ? state.players.find((p) => p.id === hunterPending) || nightDeaths.find((d) => d.id === hunterPending) : null;

  return (
    <div className="screen ww-screen ww-day view-enter">
      <GameHeader onBack={onBack} title="Morning" icon="☀️" />
      <RoundBadge round={round} />

      {nightDeaths.length === 0 ? (
        <p className="ww-day-empty">Everyone survived the night!</p>
      ) : (
        <div className="ww-death-list">
          {nightDeaths.map((d) => (
            <div key={d.id} className="ww-death-row">
              <Avatar name={d.name} size={36} />
              <span className="ww-death-name">{d.name}</span>
              <span className="ww-death-role">{roleName(d.role)}</span>
            </div>
          ))}
        </div>
      )}

      {hunterPending != null && <HunterRevenge state={state} dispatch={dispatch} hunterName={hunter?.name} />}

      {hunterPending == null && (
        <button className="btn-primary ww-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_NIGHT' })}>
          Continue to the vote
        </button>
      )}
    </div>
  );
}

export function DayVote({ state, dispatch, onBack }) {
  const { players, voteMarks, round } = state;
  const living = players.filter((p) => p.alive);
  const currentVoter = living.find((p) => !(p.id in voteMarks));

  const tally = {};
  Object.values(voteMarks).forEach((id) => { tally[id] = (tally[id] || 0) + 1; });

  return (
    <div className="screen ww-screen ww-day view-enter">
      <GameHeader onBack={onBack} title="Day Vote" icon="☀️" />
      <RoundBadge round={round} />

      {currentVoter ? (
        <>
          <p className="ww-day-prompt"><strong>{currentVoter.name}</strong>, who do you vote to eliminate?</p>
          <div className="ww-target-list">
            {living.map((p) => (
              <button key={p.id} className="ww-target" onClick={() => dispatch({ type: 'CAST_VOTE', voterId: currentVoter.id, targetId: p.id })}>
                <Avatar name={p.name} size={36} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <p className="ww-vote-progress">{Object.keys(voteMarks).length} / {living.length} voted</p>
        </>
      ) : (
        <>
          <p className="ww-day-prompt">All votes are in.</p>
          <div className="ww-tally-list">
            {living.map((p) => (
              tally[p.id] ? (
                <div key={p.id} className="ww-tally-row">
                  <Avatar name={p.name} size={28} />
                  <span>{p.name}</span>
                  <span className="ww-tally-count">{tally[p.id]} vote{tally[p.id] !== 1 ? 's' : ''}</span>
                </div>
              ) : null
            ))}
          </div>
          <button className="btn-primary ww-action" onClick={() => dispatch({ type: 'REVEAL_VOTE_RESULT' })}>
            Reveal result
          </button>
        </>
      )}
    </div>
  );
}

export function DayResult({ state, dispatch, onBack }) {
  const { voteResult, hunterPending, round } = state;
  const hunter = hunterPending != null ? state.players.find((p) => p.id === hunterPending) : null;

  return (
    <div className="screen ww-screen ww-day view-enter">
      <GameHeader onBack={onBack} title="Vote Result" icon="☀️" />
      <RoundBadge round={round} />

      {voteResult.eliminated ? (
        <div className="ww-death-list">
          <div className="ww-death-row">
            <Avatar name={voteResult.eliminated.name} size={36} />
            <span className="ww-death-name">{voteResult.eliminated.name}</span>
            <span className="ww-death-role">{roleName(voteResult.eliminated.role)}</span>
          </div>
        </div>
      ) : (
        <p className="ww-day-empty">The vote was tied — no one was eliminated.</p>
      )}

      {voteResult.revenge && (
        <div className="ww-death-list">
          <div className="ww-death-row">
            <Avatar name={voteResult.revenge.name} size={36} />
            <span className="ww-death-name">{voteResult.revenge.name}</span>
            <span className="ww-death-role">{roleName(voteResult.revenge.role)}</span>
          </div>
        </div>
      )}

      {hunterPending != null && <HunterRevenge state={state} dispatch={dispatch} hunterName={hunter?.name} />}

      {hunterPending == null && (
        <button className="btn-primary ww-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_DAY' })}>
          Continue
        </button>
      )}
    </div>
  );
}

export function End({ state, dispatch, onBack }) {
  const { players, winner, round } = state;
  const goodList = players.filter((p) => p.team === 'good');
  const evilList = players.filter((p) => p.team === 'evil');

  function row(p) {
    return (
      <div key={p.id} className={`ww-role-row ${p.team} ${p.alive ? '' : 'dead'}`}>
        <Avatar name={p.name} size={32} />
        <span className="ww-role-row-name">{p.name}</span>
        <span className="ww-role-row-role">{roleName(p.role)}</span>
        <span className={`ww-role-row-team ${p.team}`}>{teamName(p.team)}</span>
      </div>
    );
  }

  return (
    <div className="screen ww-screen ww-end view-enter">
      <GameHeader onBack={onBack} title="Game Over" icon="🌕" />

      <div className={`ww-end-banner ${winner === 'good' ? 'good' : 'evil'}`}>
        <span className="ww-end-icon">{winner === 'good' ? '🕯️' : '🐺'}</span>
        <h1 className="ww-end-title">{winner === 'good' ? 'Villagers Win!' : 'Werewolves Win!'}</h1>
        <p className="ww-end-reason">
          {winner === 'good' ? 'Every Werewolf was found and eliminated.' : 'The Werewolves equal or outnumber the villagers.'}
        </p>
        <p className="ww-end-rounds">Survived {round} night{round !== 1 ? 's' : ''}.</p>
      </div>

      <div className="ww-roles-reveal">
        <div className="ww-role-group good"><div className="ww-role-group-title">Good</div>{goodList.map(row)}</div>
        <div className="ww-role-group evil"><div className="ww-role-group-title">Evil</div>{evilList.map(row)}</div>
      </div>

      <div className="ww-end-actions">
        <button className="btn-primary" onClick={() => dispatch({ type: 'START_GAME' })}>Play again</button>
        <button className="btn-secondary" onClick={() => dispatch({ type: 'NEW_LOBBY' })}>Change setup</button>
      </div>
    </div>
  );
}
