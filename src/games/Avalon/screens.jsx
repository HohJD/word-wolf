import Avatar from '../../components/Avatar';
import GameHeader from '../../components/GameHeader';
import { getCounts, getQuestSize, getKnowledge, roleName, roleDesc, teamName, evilExtraAvailable } from './engine';

function teamClass(team) {
  return team === 'good' ? 'avalon-good' : 'avalon-evil';
}

const OPTIONAL_ROLES = [
  { key: 'percival', label: 'Percival & Morgana', desc: 'Percival can spot Merlin — but Morgana looks the same to him.', cost: 1 },
  { key: 'mordred', label: 'Mordred', desc: 'An evil player that even Merlin can’t see.', cost: 1 },
  { key: 'oberon', label: 'Oberon', desc: 'An evil player who doesn’t know the other evil players, and isn’t known by them.', cost: 1 },
];

export function Lobby({ state, dispatch, onBack }) {
  const { playerCount, names, roles, error } = state;
  const [good, evil] = getCounts(playerCount);
  const extra = evilExtraAvailable(playerCount);
  const used = (roles.percival ? 1 : 0) + (roles.mordred ? 1 : 0) + (roles.oberon ? 1 : 0);

  return (
    <div className="screen avalon-screen avalon-lobby view-enter">
      <div className="avalon-hero">
        <button className="back-btn" onClick={onBack}>← Games</button>
        <span className="avalon-castle">🏰</span>
        <h1 className="avalon-title">Avalon</h1>
        <p className="avalon-subtitle">Some players are secretly evil. Work together to find them.</p>
      </div>

      <div className="avalon-card">
        <div className="avalon-field">
          <label>Players</label>
          <div className="avalon-stepper">
            <button onClick={() => dispatch({ type: 'SET_PLAYER_COUNT', count: playerCount - 1 })}>−</button>
            <span>{playerCount}</span>
            <button onClick={() => dispatch({ type: 'SET_PLAYER_COUNT', count: playerCount + 1 })}>+</button>
          </div>
        </div>

        <div className="avalon-field">
          <label>Names</label>
          <div className="avalon-names">
            {names.map((name, i) => (
              <input
                key={i}
                className="avalon-input"
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => dispatch({ type: 'SET_NAME', index: i, name: e.target.value })}
                maxLength={20}
              />
            ))}
          </div>
        </div>

        <div className="avalon-field">
          <label>Optional Roles</label>
          <p className="avalon-note avalon-note-standalone">Merlin and the Assassin are always included.</p>
          <div className="avalon-toggle-list">
            {OPTIONAL_ROLES.map((r) => {
              const active = roles[r.key];
              const disabled = !active && used + r.cost > extra;
              return (
                <button
                  key={r.key}
                  className={`avalon-toggle-row ${active ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'TOGGLE_ROLE', role: r.key })}
                >
                  <span className={`avalon-toggle-box ${active ? 'on' : ''}`}>{active ? '✓' : ''}</span>
                  <span className="avalon-toggle-copy">
                    <span className="avalon-toggle-name">{r.label}</span>
                    <span className="avalon-toggle-desc">{r.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="avalon-balance">
          <span className="avalon-good">Good {good}</span>
          <span className="avalon-vs">vs</span>
          <span className="avalon-evil">Evil {evil}</span>
        </div>

        {error && <p className="avalon-error">{error}</p>}
      </div>

      <button className="btn-primary avalon-start" onClick={() => dispatch({ type: 'START_GAME' })}>
        Start Game
      </button>
    </div>
  );
}

export function Reveal({ state, dispatch }) {
  const { players, revealIndex, revealMode } = state;
  const player = players[revealIndex];
  const knowledge = getKnowledge(player, players);

  return (
    <div className="screen avalon-screen avalon-reveal view-enter">
      <div className="avalon-reveal-card">
        <span className="avalon-reveal-num">{revealIndex + 1} / {players.length}</span>
        {revealMode === 'pass' ? (
          <>
            <p className="avalon-reveal-pass">Pass the device to</p>
            <h2 className="avalon-reveal-name">{player.name}</h2>
            <Avatar name={player.name} size={80} />
            <p className="avalon-reveal-instr">Make sure no one else can see the screen, then tap to reveal.</p>
            <button className="btn-primary avalon-reveal-btn" onClick={() => dispatch({ type: 'CONFIRM_REVEAL' })}>
              Reveal role
            </button>
          </>
        ) : (
          <>
            <p className={`avalon-team ${teamClass(player.team)}`}>{teamName(player.team)}</p>
            <h2 className="avalon-reveal-name">{roleName(player.role)}</h2>
            <p className="avalon-role-desc">{roleDesc(player.role)}</p>
            {(knowledge.players.length > 0 || knowledge.lonely) && (
              <div className={`avalon-knowledge ${knowledge.lonely ? 'lonely' : ''}`}>
                <p className="avalon-knowledge-text">{knowledge.text}</p>
                {knowledge.players.length > 0 && (
                  <div className="avalon-known-list">
                    {knowledge.players.map((p) => (
                      <div key={p.id} className="avalon-known">
                        <Avatar name={p.name} size={28} />
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button className="btn-primary avalon-reveal-btn" onClick={() => dispatch({ type: 'HIDE_REVEAL' })}>
              {revealIndex + 1 >= players.length ? 'Hide & Begin the Quest' : 'Hide & pass on'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Board({ state, dispatch, onBack }) {
  const { players, leaderIndex, questIndex, quests, rejectCount, voteHistory } = state;
  const leader = players[leaderIndex % players.length];
  const currentQuest = quests[questIndex];

  return (
    <div className="screen avalon-screen avalon-board view-enter">
      <GameHeader onBack={onBack} title="Avalon" subtitle="The Round Table" icon="🏰" activePlayer={leader.name} />

      <div className="avalon-track">
        {quests.map((q, i) => (
          <div key={i} className={`avalon-quest ${q.result}`}>
            <span className="avalon-quest-num">{i + 1}</span>
            <span className="avalon-quest-size">{q.size}</span>
            {q.requiredFails > 1 && <span className="avalon-quest-fails">2 fails</span>}
          </div>
        ))}
      </div>

      <div className="avalon-status">
        <div className="avalon-status-row">
          <span>Leader</span>
          <strong>{leader.name}</strong>
        </div>
        <div className="avalon-status-row">
          <span>Quest {questIndex + 1}</span>
          <strong>{currentQuest?.size} players {currentQuest?.requiredFails > 1 ? '• 2 fails needed' : ''}</strong>
        </div>
        <div className="avalon-status-row">
          <span>Rejections</span>
          <div className="avalon-reject-dots">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`avalon-reject-dot ${i < rejectCount ? 'on' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="avalon-history">
        <p className="avalon-history-title">Vote History</p>
        {voteHistory.length === 0 ? (
          <p className="avalon-history-empty">No proposals yet.</p>
        ) : (
          <div className="avalon-history-list">
            {voteHistory.map((h, i) => (
              <div key={i} className={`avalon-history-item ${h.result}`}>
                <span>{h.leader} proposed {h.team.join(', ')}</span>
                <span className="avalon-history-votes">
                  {Object.values(h.votes).filter((v) => v === 'approve').length}✓ / {Object.values(h.votes).filter((v) => v === 'reject').length}✗
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'START_PROPOSE' })}>
        Propose team →
      </button>
    </div>
  );
}

export function Propose({ state, dispatch, onBack }) {
  const { players, leaderIndex, questIndex, playerCount, proposedTeam, error } = state;
  const leader = players[leaderIndex % players.length];
  const size = getQuestSize(playerCount, questIndex);

  return (
    <div className="screen avalon-screen avalon-propose view-enter">
      <GameHeader onBack={onBack} title="Propose Team" icon="🏰" activePlayer={leader.name} />

      <div className="avalon-propose-info">
        <p className="avalon-propose-leader">Leader: {leader.name}</p>
        <p className="avalon-propose-quest">Quest {questIndex + 1} — choose {size} players</p>
      </div>

      <div className="avalon-propose-list">
        {players.map((p) => (
          <button
            key={p.id}
            className={`avalon-propose-player ${proposedTeam.includes(p.id) ? 'selected' : ''}`}
            onClick={() => dispatch({ type: 'PROPOSE_TOGGLE', id: p.id })}
          >
            <Avatar name={p.name} size={36} />
            <span>{p.name}</span>
            {proposedTeam.includes(p.id) && <span className="avalon-check">✓</span>}
          </button>
        ))}
      </div>

      <p className="avalon-propose-count">{proposedTeam.length} / {size} selected</p>
      {error && <p className="avalon-error">{error}</p>}

      <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'SUBMIT_PROPOSAL' })}>
        Submit proposal
      </button>
    </div>
  );
}

export function Vote({ state, dispatch, onBack }) {
  const { players, phase, currentVotes, voteIndex, voteResult } = state;

  if (phase === 'vote') {
    const voter = players[voteIndex];
    return (
      <div className="screen avalon-screen avalon-vote view-enter">
        <GameHeader onBack={onBack} title="Approve or Reject" icon="🏰" />
        <p className="avalon-vote-prompt">Pass to {voter.name}</p>
        <Avatar name={voter.name} size={96} />
        <p className="avalon-vote-question">Do you approve this team?</p>
        <div className="avalon-vote-buttons">
          <button className="avalon-vote-btn approve" onClick={() => dispatch({ type: 'CAST_VOTE', id: voter.id, vote: 'approve' })}>
            ✓ Approve
          </button>
          <button className="avalon-vote-btn reject" onClick={() => dispatch({ type: 'CAST_VOTE', id: voter.id, vote: 'reject' })}>
            ✗ Reject
          </button>
        </div>
        <p className="avalon-vote-progress">{Object.keys(currentVotes).length} / {players.length} voted</p>
      </div>
    );
  }

  if (phase === 'vote_reveal') {
    return (
      <div className="screen avalon-screen avalon-vote view-enter">
        <GameHeader onBack={onBack} title="Voting" icon="🏰" />
        <p className="avalon-vote-prompt">All votes are cast.</p>
        <p className="avalon-vote-question">Ready to reveal?</p>
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'REVEAL_VOTES' })}>
          Reveal votes
        </button>
      </div>
    );
  }

  const approved = voteResult.result === 'approved';
  return (
    <div className="screen avalon-screen avalon-vote view-enter">
      <GameHeader onBack={onBack} title="Result" icon="🏰" />
      <div className={`avalon-vote-result ${approved ? 'success' : 'fail'}`}>
        <p className="avalon-vote-result-title">{approved ? 'Team approved' : 'Team rejected'}</p>
        <p className="avalon-vote-result-count">{voteResult.approve} ✓ · {voteResult.reject} ✗</p>
      </div>
      <div className="avalon-vote-breakdown">
        {players.map((p) => (
          <div key={p.id} className={`avalon-vote-row ${currentVotes[p.id]}`}>
            <Avatar name={p.name} size={28} />
            <span>{p.name}</span>
            <span className="avalon-vote-badge">{currentVotes[p.id] === 'approve' ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_VOTE' })}>
        Continue
      </button>
    </div>
  );
}

export function QuestPlay({ state, dispatch, onBack }) {
  const { players, phase, quests, questIndex, questCards } = state;
  const quest = quests[questIndex];

  if (phase === 'quest') {
    const team = quest.team;
    const currentId = team[Object.keys(questCards).length];
    const member = players[currentId];
    const isEvil = member.team === 'evil';

    return (
      <div className="screen avalon-screen avalon-quest view-enter">
        <GameHeader onBack={onBack} title="Quest" icon="🏰" />
        <p className="avalon-quest-prompt">Pass to {member.name}</p>
        <Avatar name={member.name} size={96} />
        <p className="avalon-quest-instruction">Choose Success or Fail</p>
        <div className="avalon-quest-cards">
          <button className="avalon-quest-card success" onClick={() => dispatch({ type: 'PLAY_QUEST_CARD', id: member.id, card: 'success' })}>
            ✓ Success
          </button>
          <button
            className="avalon-quest-card fail"
            disabled={!isEvil}
            onClick={() => dispatch({ type: 'PLAY_QUEST_CARD', id: member.id, card: 'fail' })}
          >
            ✗ Fail
          </button>
        </div>
        {!isEvil && <p className="avalon-quest-note">Good players must play Success.</p>}
        <p className="avalon-quest-progress">{Object.keys(questCards).length} / {team.length} played</p>
      </div>
    );
  }

  if (phase === 'quest_reveal') {
    return (
      <div className="screen avalon-screen avalon-quest view-enter">
        <GameHeader onBack={onBack} title="Quest" icon="🏰" />
        <p className="avalon-quest-prompt">All cards are played.</p>
        <p className="avalon-quest-instruction">Reveal the quest result?</p>
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'REVEAL_QUEST' })}>
          Reveal quest
        </button>
      </div>
    );
  }

  const { questResult } = state;
  const passed = questResult.passed;
  return (
    <div className="screen avalon-screen avalon-quest view-enter">
      <GameHeader onBack={onBack} title="Quest Result" icon="🏰" />
      <div className={`avalon-quest-result ${passed ? 'success' : 'fail'}`}>
        <p className="avalon-quest-result-title">{passed ? 'Quest succeeded' : 'Quest failed'}</p>
        <p className="avalon-quest-result-count">{questResult.failCount} fail{questResult.failCount !== 1 ? 's' : ''} · {questResult.required} needed to fail</p>
      </div>
      <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_QUEST' })}>
        Continue
      </button>
    </div>
  );
}

export function Assassin({ state, dispatch, onBack }) {
  const { players } = state;
  const assassin = players.find((p) => p.role === 'assassin');
  const targets = players.filter((p) => p.team === 'good');

  return (
    <div className="screen avalon-screen avalon-assassin view-enter">
      <GameHeader onBack={onBack} title="Assassination" icon="🏰" />
      <div className="avalon-assassin-card">
        <span className="avalon-assassin-icon">🗡️</span>
        <p className="avalon-assassin-prompt">{assassin ? assassin.name : 'The Assassin'}, who is Merlin?</p>
        <p className="avalon-assassin-sub">Good has won 3 quests. But if the Assassin guesses Merlin correctly, evil wins instead.</p>
      </div>
      <div className="avalon-assassin-list">
        {targets.map((p) => (
          <button key={p.id} className="avalon-assassin-target" onClick={() => dispatch({ type: 'ASSASSIN_GUESS', id: p.id })}>
            <Avatar name={p.name} size={44} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function End({ state, dispatch, onBack }) {
  const { players, quests, winner, reason } = state;

  return (
    <div className="screen avalon-screen avalon-end view-enter">
      <GameHeader onBack={onBack} title="Game Over" icon="🏰" />

      <div className={`avalon-end-banner ${winner === 'good' ? 'good' : 'evil'}`}>
        <span className="avalon-end-icon">{winner === 'good' ? '⚔️' : '🗡️'}</span>
        <h1 className="avalon-end-title">{winner === 'good' ? 'Good Wins!' : 'Evil Wins!'}</h1>
        {reason && <p className="avalon-end-reason">{reason}</p>}
      </div>

      <div className="avalon-roles-reveal">
        {players.map((p) => (
          <div key={p.id} className={`avalon-role-row ${p.team}`}>
            <Avatar name={p.name} size={32} />
            <span className="avalon-role-row-name">{p.name}</span>
            <span className="avalon-role-row-role">{roleName(p.role)}</span>
            <span className={`avalon-role-row-team ${p.team}`}>{teamName(p.team)}</span>
          </div>
        ))}
      </div>

      <div className="avalon-quest-track">
        {quests.map((q, i) => (
          <div key={i} className={`avalon-track-token ${q.result}`}>{i + 1}</div>
        ))}
      </div>

      <div className="avalon-end-actions">
        <button className="btn-primary" onClick={() => dispatch({ type: 'START_GAME' })}>Play again</button>
        <button className="btn-secondary" onClick={() => dispatch({ type: 'NEW_LOBBY' })}>Change setup</button>
      </div>
    </div>
  );
}
