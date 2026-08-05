import { useState } from 'react';
import Avatar from '../../components/Avatar';
import GameHeader from '../../components/GameHeader';
import { getCounts, getQuestSize, getKnowledge, roleName, roleDesc, teamName, evilExtraAvailable } from './engine';
import { waitingOn } from './state';

function teamClass(team) {
  return team === 'good' ? 'avalon-good' : 'avalon-evil';
}

const isOnline = (state) => state.mode === 'online';
const leaderOf = (state) => state.players[state.leaderIndex % state.players.length];

// Online only: what everyone who isn't the acting player sees.
export function Waiting({ message, state }) {
  const progress = waitingOn(state);
  return (
    <div className="avalon-waiting">
      <span className="avalon-waiting-dots" aria-hidden="true"><i /><i /><i /></span>
      <p className="avalon-waiting-msg">{message}</p>
      {progress && (
        <p className="avalon-waiting-count">
          {progress.done} / {progress.total} {progress.label}
        </p>
      )}
    </div>
  );
}

/**
 * Always-visible reminder of who you are and what you are, tappable to
 * re-open the full role card. Without this a player who forgets their role
 * mid-game has no way to check it — which matters most for the roles that
 * carry secret knowledge.
 */
export function YourRole({ viewer, players }) {
  const [open, setOpen] = useState(false);
  if (!viewer) return null;
  const known = (viewer.knows?.seats || []).map((seat) => players[seat]).filter(Boolean);

  return (
    <>
      <button className={`avalon-you ${teamClass(viewer.team)}`} onClick={() => setOpen(true)}>
        <Avatar name={viewer.name} size={26} />
        <span className="avalon-you-name">{viewer.name}</span>
        <span className="avalon-you-sep">·</span>
        <span className="avalon-you-role">{roleName(viewer.role)}</span>
        <span className="avalon-you-peek">tap</span>
      </button>

      {open && (
        <div className="avalon-sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="avalon-sheet" onClick={(e) => e.stopPropagation()}>
            <p className={`avalon-team ${teamClass(viewer.team)}`}>{teamName(viewer.team)}</p>
            <h2 className="avalon-reveal-name">{roleName(viewer.role)}</h2>
            <p className="avalon-role-desc">{roleDesc(viewer.role)}</p>
            {known.length > 0 && (
              <div className="avalon-knowledge">
                <p className="avalon-knowledge-text">{viewer.knows.text}</p>
                <div className="avalon-known-list">
                  {known.map((p) => (
                    <div key={p.id} className="avalon-known">
                      <Avatar name={p.name} size={28} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn-secondary" onClick={() => setOpen(false)}>Hide</button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * The quest track. Bare numbers meant nothing on their own, so each token
 * now says what it is, the current quest is highlighted, and finished
 * quests read as a clear pass or fail.
 */
export function QuestTrack({ quests, questIndex, playerCount }) {
  return (
    <div className="avalon-track-wrap">
      <div className="avalon-track">
        {quests.map((q, i) => {
          const done = q.result === 'success' || q.result === 'fail';
          const current = i === questIndex && !done;
          return (
            <div key={i} className={`avalon-quest ${q.result}${current ? ' current' : ''}`}>
              <span className="avalon-quest-num">Quest {i + 1}</span>
              <span className="avalon-quest-size">
                {done ? (q.result === 'success' ? '✓' : '✗') : q.size}
              </span>
              <span className="avalon-quest-unit">
                {done ? (q.result === 'success' ? 'passed' : 'failed') : 'players'}
              </span>
              {q.requiredFails > 1 && !done && <span className="avalon-quest-fails">needs 2 fails</span>}
            </div>
          );
        })}
      </div>
      <p className="avalon-track-key">
        {playerCount ? `Good needs 3 quests to win · Evil needs 3` : ''}
      </p>
    </div>
  );
}

/**
 * The quest team, shown as faces rather than a comma list. This is what a
 * voter is actually weighing up, so it gets the centre of the screen.
 */
export function TeamDisplay({ players, seats, questIndex, total = 5, caption }) {
  return (
    <div className="avalon-team-display">
      <p className="avalon-team-caption">
        {caption ?? `Quest ${questIndex + 1} of ${total}`}
      </p>
      <div className="avalon-team-faces">
        {seats.map((id) => {
          const p = players[id];
          if (!p) return null;
          return (
            <div key={id} className="avalon-team-face">
              <Avatar name={p.name} size={54} />
              <span className="avalon-team-face-name">{p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One-line "here is what is happening right now". */
export function StepBanner({ you, text }) {
  return (
    <div className={`avalon-step ${you ? 'you' : ''}`}>
      <span className="avalon-step-tag">{you ? 'Your turn' : 'Waiting'}</span>
      <span className="avalon-step-text">{text}</span>
    </div>
  );
}

// The private knowledge block shown to a single player (their own view).
function KnowledgeBlock({ knowledge }) {
  if (knowledge.players.length === 0 && !knowledge.lonely) return null;
  return (
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
  );
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

export function Reveal({ state, dispatch, viewer }) {
  const { players, revealIndex, revealMode } = state;

  // Online: no passing. Each phone shows only its own player's role, and
  // the private knowledge is computed server-side — the public player list
  // carries names only, so it cannot be derived here.
  if (isOnline(state)) {
    if (!viewer) return null;
    const knowledge = {
      text: viewer.knows?.text || 'You have no special knowledge.',
      players: (viewer.knows?.seats || []).map((seat) => players[seat]).filter(Boolean),
      lonely: viewer.team === 'evil' && (viewer.knows?.seats || []).length === 0,
    };
    const acknowledged = Boolean(state.ready?.[viewer.id]);

    return (
      <div className="screen avalon-screen avalon-reveal view-enter">
        <div className="avalon-reveal-card">
          <p className={`avalon-team ${teamClass(viewer.team)}`}>{teamName(viewer.team)}</p>
          <h2 className="avalon-reveal-name">{roleName(viewer.role)}</h2>
          <p className="avalon-role-desc">{roleDesc(viewer.role)}</p>
          <KnowledgeBlock knowledge={knowledge} />
          {acknowledged ? (
            <Waiting message="Waiting for the others to read their roles…" state={state} />
          ) : (
            <button
              className="btn-primary avalon-reveal-btn"
              onClick={() => dispatch({ type: 'MARK_READY', id: viewer.id })}
            >
              Got it — I'm ready
            </button>
          )}
        </div>
      </div>
    );
  }

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

export function Board({ state, dispatch, onBack, viewer }) {
  const { players, leaderIndex, questIndex, quests, rejectCount, voteHistory } = state;
  const leader = players[leaderIndex % players.length];
  const currentQuest = quests[questIndex];

  return (
    <div className="screen avalon-screen avalon-board view-enter">
      <GameHeader onBack={onBack} title="Avalon" subtitle="The Round Table" icon="🏰"
        activePlayer={leader.name} activeLabel="Leader"
        backLabel={isOnline(state) ? '← Leave' : '← Games'} />

      {isOnline(state) && <YourRole viewer={viewer} players={players} />}

      <StepBanner
        you={!isOnline(state) || viewer?.id === leader.id}
        text={(!isOnline(state) || viewer?.id === leader.id)
          ? `Pick ${currentQuest?.size} players for Quest ${questIndex + 1}`
          : `${leader.name} is picking ${currentQuest?.size} players for Quest ${questIndex + 1}`}
      />

      <QuestTrack quests={quests} questIndex={questIndex} playerCount={players.length} />

      <div className="avalon-status">
        <div className="avalon-status-row">
          <span>Rejected proposals</span>
          <div className="avalon-reject-dots">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`avalon-reject-dot ${i < rejectCount ? 'on' : ''}`} />
            ))}
          </div>
        </div>
        <p className="avalon-status-note">5 rejections in a row and evil wins.</p>
      </div>

      {voteHistory.length > 0 && (
      <div className="avalon-history">
        <p className="avalon-history-title">Vote History</p>
        {(
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
      )}

      {(!isOnline(state) || viewer?.id === leader.id) && (
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'START_PROPOSE' })}>
          Propose team →
        </button>
      )}
    </div>
  );
}

export function Propose({ state, dispatch, onBack, viewer }) {
  const { players, leaderIndex, questIndex, playerCount, proposedTeam, error } = state;
  const leader = players[leaderIndex % players.length];
  const size = getQuestSize(playerCount, questIndex);
  const canPick = !isOnline(state) || (viewer && viewer.id === leader.id);

  return (
    <div className="screen avalon-screen avalon-propose view-enter">
      <GameHeader onBack={onBack} title="Propose Team" icon="🏰"
        activePlayer={leader.name} activeLabel="Leader"
        backLabel={isOnline(state) ? '← Leave' : '← Games'} />

      {isOnline(state) && <YourRole viewer={viewer} players={players} />}

      <StepBanner
        you={canPick}
        text={canPick
          ? `Tap ${size} players to send on Quest ${questIndex + 1}`
          : `${leader.name} is choosing who goes on Quest ${questIndex + 1}`}
      />

      <div className="avalon-propose-list">
        {players.map((p) => (
          <button
            key={p.id}
            className={`avalon-propose-player ${proposedTeam.includes(p.id) ? 'selected' : ''}`}
            disabled={!canPick}
            onClick={() => dispatch({ type: 'PROPOSE_TOGGLE', id: p.id })}
          >
            <Avatar name={p.name} size={36} />
            <span>{p.name}</span>
            {proposedTeam.includes(p.id) && <span className="avalon-check">✓</span>}
          </button>
        ))}
      </div>

      <p className="avalon-propose-count">{proposedTeam.length} / {size} selected</p>
      {error && canPick && <p className="avalon-error">{error}</p>}

      {canPick ? (
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'SUBMIT_PROPOSAL' })}>
          Submit proposal
        </button>
      ) : (
        <Waiting message={`${leader.name} is choosing the team…`} state={state} />
      )}
    </div>
  );
}

export function Vote({ state, dispatch, onBack, viewer }) {
  const { players, phase, currentVotes, voteIndex, voteResult } = state;

  if (isOnline(state) && phase === 'vote') {
    if (!viewer) return null;
    const myVote = currentVotes[viewer.id];
    return (
      <div className="screen avalon-screen avalon-vote view-enter">
        <GameHeader onBack={onBack} title="Approve or Reject" icon="🏰" backLabel="← Leave" />
        <YourRole viewer={viewer} players={players} />
        <StepBanner
          you={!myVote}
          text={myVote ? 'Vote locked in — nobody can see it yet'
                       : 'Everyone votes at the same time. Nobody sees votes until all are in.'}
        />
        <TeamDisplay
          players={players}
          seats={state.proposedTeam}
          questIndex={state.questIndex}
        />
        {myVote ? (
          <>
            <p className="avalon-vote-cast">You voted {myVote === 'approve' ? '✓ Approve' : '✗ Reject'}</p>
            <Waiting message="Waiting for everyone else to vote…" state={state} />
          </>
        ) : (
          <>
            <p className="avalon-vote-question">Do you approve this team?</p>
            <div className="avalon-vote-buttons">
              <button className="avalon-vote-btn approve" onClick={() => dispatch({ type: 'CAST_VOTE', id: viewer.id, vote: 'approve' })}>
                ✓ Approve
              </button>
              <button className="avalon-vote-btn reject" onClick={() => dispatch({ type: 'CAST_VOTE', id: viewer.id, vote: 'reject' })}>
                ✗ Reject
              </button>
            </div>
            <p className="avalon-vote-progress">{Object.keys(currentVotes).length} / {players.length} voted</p>
          </>
        )}
      </div>
    );
  }

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
      <GameHeader onBack={onBack} title="Result" icon="🏰"
        backLabel={isOnline(state) ? '← Leave' : '← Games'} />
      {isOnline(state) && <YourRole viewer={viewer} players={players} />}
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
      {isOnline(state) && viewer && viewer.id !== leaderOf(state).id ? (
        <Waiting message={`Waiting for ${leaderOf(state).name} to continue…`} state={state} />
      ) : (
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_VOTE' })}>
          Continue
        </button>
      )}
    </div>
  );
}

export function QuestPlay({ state, dispatch, onBack, viewer }) {
  const { players, phase, quests, questIndex, questCards } = state;
  const quest = quests[questIndex];

  if (isOnline(state) && phase === 'quest') {
    if (!viewer) return null;
    const onTeam = quest.team.includes(viewer.id);
    const played = questCards[viewer.id] !== undefined;
    const isEvil = viewer.team === 'evil';

    if (!onTeam) {
      return (
        <div className="screen avalon-screen avalon-quest view-enter">
          <GameHeader onBack={onBack} title="Quest" icon="🏰" backLabel="← Leave" />
          <YourRole viewer={viewer} players={players} />
          <StepBanner you={false} text="You are not on this quest — sit tight." />
          <TeamDisplay players={players} seats={quest.team} questIndex={questIndex} />
          <Waiting message="Waiting for the team to play their cards…" state={state} />
        </div>
      );
    }

    return (
      <div className="screen avalon-screen avalon-quest view-enter">
        <GameHeader onBack={onBack} title="Quest" icon="🏰" backLabel="← Leave" />
        <YourRole viewer={viewer} players={players} />
        <StepBanner
          you={!played}
          text={played ? 'Card played — the result shows once everyone has played'
                       : (isEvil ? 'You may pass or sabotage. Nobody learns who did what.'
                                 : 'You are good, so you must play Success.')}
        />
        {played ? (
          <>
            <p className="avalon-quest-prompt">Card played.</p>
            <Waiting message="Waiting for the rest of the team…" state={state} />
          </>
        ) : (
          <>
            <TeamDisplay
              players={players}
              seats={quest.team}
              questIndex={questIndex}
              caption={`Quest ${questIndex + 1} · ${quest.requiredFails > 1 ? '2 fails' : '1 fail'} sinks it`}
            />
            <p className="avalon-quest-instruction">
              {isEvil ? 'Play your card' : 'Send the quest through'}
            </p>
            <div className="avalon-quest-cards">
              <button className="avalon-quest-card success" onClick={() => dispatch({ type: 'PLAY_QUEST_CARD', id: viewer.id, card: 'success' })}>
                ✓ Success
              </button>
              <button
                className="avalon-quest-card fail"
                disabled={!isEvil}
                onClick={() => dispatch({ type: 'PLAY_QUEST_CARD', id: viewer.id, card: 'fail' })}
              >
                ✗ Fail
              </button>
            </div>
            <p className="avalon-quest-progress">{Object.keys(questCards).length} / {quest.team.length} played</p>
          </>
        )}
      </div>
    );
  }

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
      <GameHeader onBack={onBack} title="Quest Result" icon="🏰"
        backLabel={isOnline(state) ? '← Leave' : '← Games'} />
      {isOnline(state) && <YourRole viewer={viewer} players={players} />}
      <div className={`avalon-quest-result ${passed ? 'success' : 'fail'}`}>
        <p className="avalon-quest-result-title">{passed ? 'Quest succeeded' : 'Quest failed'}</p>
        <p className="avalon-quest-result-count">{questResult.failCount} fail{questResult.failCount !== 1 ? 's' : ''} · {questResult.required} needed to fail</p>
      </div>
      {isOnline(state) && viewer && viewer.id !== leaderOf(state).id ? (
        <Waiting message={`Waiting for ${leaderOf(state).name} to continue…`} state={state} />
      ) : (
        <button className="btn-primary avalon-action" onClick={() => dispatch({ type: 'CONTINUE_FROM_QUEST' })}>
          Continue
        </button>
      )}
    </div>
  );
}

export function Assassin({ state, dispatch, onBack, viewer }) {
  const { players } = state;
  const online = isOnline(state);
  // Online: nobody's role is public, so the Assassin can only be identified
  // from the viewer's own secret.
  const assassin = online ? (viewer?.role === 'assassin' ? viewer : null)
                          : players.find((p) => p.role === 'assassin');
  // Likewise, good players can't be filtered publicly — offer everyone else.
  const targets = online ? players.filter((p) => p.id !== viewer?.id)
                         : players.filter((p) => p.team === 'good');

  // Online: only the Assassin picks; everyone else watches.
  if (isOnline(state) && viewer && viewer.role !== 'assassin') {
    return (
      <div className="screen avalon-screen avalon-assassin view-enter">
        <GameHeader onBack={onBack} title="Assassination" icon="🏰" />
        <div className="avalon-assassin-card">
          <span className="avalon-assassin-icon">🗡️</span>
          <p className="avalon-assassin-prompt">Good has won 3 quests.</p>
          <p className="avalon-assassin-sub">The Assassin now gets one guess at Merlin. Guess right and evil steals the win.</p>
        </div>
        <Waiting message="The Assassin is choosing…" state={state} />
      </div>
    );
  }

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

export function End({ state, dispatch, onBack, isHost = true }) {
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

      {isHost ? (
        <div className="avalon-end-actions">
          <button className="btn-primary" onClick={() => dispatch({ type: 'START_GAME' })}>Play again</button>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'NEW_LOBBY' })}>Change setup</button>
        </div>
      ) : (
        <p className="avalon-end-hostnote">Waiting for the host to start another round…</p>
      )}
    </div>
  );
}
