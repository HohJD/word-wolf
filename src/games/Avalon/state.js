import { validateSetup, assignRoles, createQuests, getQuestSize } from './engine';

export const initialState = {
  mode: 'pass', // 'pass' = one device passed around, 'online' = a room per phone
  phase: 'lobby',
  playerCount: 5,
  names: [],
  roles: { percival: false, mordred: false, oberon: false },
  players: null,
  leaderIndex: 0,
  questIndex: 0,
  quests: [],
  rejectCount: 0,
  voteHistory: [],
  proposedTeam: [],
  currentVotes: {},
  voteIndex: 0,
  voteResult: null,
  questCards: {},
  questCardIndex: 0,
  questResult: null,
  revealIndex: 0,
  revealMode: 'pass',
  ready: {}, // online only: who has seen their role / acknowledged a result
  assassinGuess: null,
  winner: null,
  merlinKilled: false,
  reason: '',
  error: null,
};

export function init({ players, mode = 'pass' }) {
  const count = Math.min(10, Math.max(5, players.length || 5));
  const names = players.slice(0, count).map((n) => n.trim());
  while (names.length < count) names.push('');
  return { ...initialState, mode, playerCount: count, names };
}

function resetRoundState(state) {
  return {
    ...state,
    leaderIndex: 0,
    questIndex: 0,
    rejectCount: 0,
    voteHistory: [],
    proposedTeam: [],
    currentVotes: {},
    voteIndex: 0,
    voteResult: null,
    questCards: {},
    questCardIndex: 0,
    questResult: null,
    revealIndex: 0,
    revealMode: 'pass',
    ready: {},
    assassinGuess: null,
    winner: null,
    merlinKilled: false,
    reason: '',
    error: null,
  };
}

const tallyVotes = (votes) => {
  const approve = Object.values(votes).filter((v) => v === 'approve').length;
  const reject = Object.values(votes).filter((v) => v === 'reject').length;
  return { approve, reject, result: approve > reject ? 'approved' : 'rejected' };
};

export function avalonReducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER_COUNT': {
      const count = Math.min(10, Math.max(5, action.count));
      const names = [...state.names];
      if (count > names.length) while (names.length < count) names.push('');
      else names.length = count;
      return { ...state, playerCount: count, names, error: null };
    }
    case 'SET_NAME': {
      const names = [...state.names];
      names[action.index] = action.name;
      return { ...state, names, error: null };
    }
    case 'TOGGLE_ROLE': {
      const roles = { ...state.roles, [action.role]: !state.roles[action.role] };
      return { ...state, roles, error: null };
    }
    case 'START_GAME': {
      // Online mode seats the players from the lobby, so names arrive with the action.
      const names = action.names || state.names;
      const playerCount = names.length;
      const error = validateSetup(playerCount, names, state.roles);
      if (error) return { ...state, error };
      const players = assignRoles(names, state.roles);
      return {
        ...resetRoundState(state),
        phase: 'reveal',
        playerCount,
        names,
        players,
        quests: createQuests(playerCount),
      };
    }
    case 'NEW_LOBBY':
      return {
        ...initialState,
        mode: state.mode,
        names: state.names,
        playerCount: state.playerCount,
        roles: state.roles,
      };

    // ── Role reveal ────────────────────────────────────────
    case 'CONFIRM_REVEAL':
      return { ...state, revealMode: 'show' };
    case 'HIDE_REVEAL': {
      const next = state.revealIndex + 1;
      if (next >= state.players.length) {
        return { ...state, revealIndex: next, revealMode: 'pass', phase: 'board' };
      }
      return { ...state, revealIndex: next, revealMode: 'pass' };
    }
    // Online: each player acknowledges their own role on their own phone.
    case 'MARK_READY': {
      const ready = { ...state.ready, [action.id]: true };
      const all = Object.keys(ready).length >= state.players.length;
      return { ...state, ready, phase: all ? 'board' : state.phase };
    }

    case 'START_PROPOSE':
      return { ...state, phase: 'propose', error: null };
    case 'PROPOSE_TOGGLE': {
      const set = new Set(state.proposedTeam);
      if (set.has(action.id)) set.delete(action.id);
      else set.add(action.id);
      return { ...state, proposedTeam: Array.from(set), error: null };
    }
    case 'SUBMIT_PROPOSAL': {
      const size = getQuestSize(state.playerCount, state.questIndex);
      if (state.proposedTeam.length !== size) {
        return { ...state, error: `Select exactly ${size} players.` };
      }
      return { ...state, phase: 'vote', currentVotes: {}, voteIndex: 0, error: null };
    }

    case 'CAST_VOTE': {
      const currentVotes = { ...state.currentVotes, [action.id]: action.vote };
      if (state.mode === 'online') {
        // Simultaneous secret ballot. Resolving inline keeps it to a single
        // write, so several phones voting at once can't race an extra step.
        if (Object.keys(currentVotes).length < state.players.length) {
          return { ...state, currentVotes, error: null };
        }
        return { ...state, currentVotes, voteIndex: 0, voteResult: tallyVotes(currentVotes), phase: 'vote_result' };
      }
      const next = state.voteIndex + 1;
      if (next >= state.players.length) {
        return { ...state, currentVotes, voteIndex: 0, phase: 'vote_reveal' };
      }
      return { ...state, currentVotes, voteIndex: next };
    }
    case 'REVEAL_VOTES':
      return { ...state, voteResult: tallyVotes(state.currentVotes), phase: 'vote_result' };

    case 'CONTINUE_FROM_VOTE': {
      const leader = state.players[state.leaderIndex % state.players.length];
      const team = state.proposedTeam.map((id) => state.players[id]);
      const historyItem = {
        leader: leader.name,
        team: team.map((p) => p.name),
        votes: { ...state.currentVotes },
        result: state.voteResult.result,
      };
      if (state.voteResult.result === 'approved') {
        const quests = state.quests.map((q, i) =>
          i === state.questIndex ? { ...q, team: [...state.proposedTeam], votes: { ...state.currentVotes } } : q
        );
        return {
          ...state,
          quests,
          phase: 'quest',
          rejectCount: 0,
          proposedTeam: [],
          currentVotes: {},
          voteIndex: 0,
          voteResult: null,
          questCards: {},
          questCardIndex: 0,
          voteHistory: [...state.voteHistory, historyItem],
          error: null,
        };
      }
      const rejectCount = state.rejectCount + 1;
      if (rejectCount >= 5) {
        return {
          ...state,
          rejectCount,
          winner: 'evil',
          reason: '5 team proposals were rejected in a row, so evil wins automatically.',
          phase: 'end',
          proposedTeam: [],
          currentVotes: {},
          voteResult: null,
          voteHistory: [...state.voteHistory, historyItem],
          error: null,
        };
      }
      return {
        ...state,
        rejectCount,
        leaderIndex: state.leaderIndex + 1,
        phase: 'propose',
        proposedTeam: [],
        currentVotes: {},
        voteResult: null,
        voteHistory: [...state.voteHistory, historyItem],
        error: null,
      };
    }

    case 'PLAY_QUEST_CARD': {
      const questCards = { ...state.questCards, [action.id]: action.card };
      const team = state.quests[state.questIndex].team;
      if (state.mode === 'online') {
        if (Object.keys(questCards).length < team.length) {
          return { ...state, questCards, error: null };
        }
        const q = state.quests[state.questIndex];
        const failCount = Object.values(questCards).filter((c) => c === 'fail').length;
        return {
          ...state,
          questCards,
          questCardIndex: 0,
          questResult: { failCount, required: q.requiredFails, passed: failCount < q.requiredFails },
          phase: 'quest_result',
        };
      }
      const next = state.questCardIndex + 1;
      if (next >= team.length) {
        return { ...state, questCards, questCardIndex: 0, phase: 'quest_reveal' };
      }
      return { ...state, questCards, questCardIndex: next };
    }
    case 'REVEAL_QUEST': {
      const q = state.quests[state.questIndex];
      const failCount = Object.values(state.questCards).filter((c) => c === 'fail').length;
      const passed = failCount < q.requiredFails;
      return { ...state, questResult: { failCount, required: q.requiredFails, passed }, phase: 'quest_result' };
    }
    case 'CONTINUE_FROM_QUEST': {
      const { questResult } = state;
      const quests = state.quests.map((q, i) =>
        i === state.questIndex ? { ...q, result: questResult.passed ? 'success' : 'fail', cards: { ...state.questCards } } : q
      );
      const successCount = quests.filter((q) => q.result === 'success').length;
      const failCount = quests.filter((q) => q.result === 'fail').length;
      const base = {
        ...state,
        quests,
        questIndex: state.questIndex + 1,
        leaderIndex: state.leaderIndex + 1,
        proposedTeam: [],
        currentVotes: {},
        voteIndex: 0,
        voteResult: null,
        questCards: {},
        questCardIndex: 0,
        questResult: null,
      };
      if (failCount >= 3) {
        return { ...base, phase: 'end', winner: 'evil', reason: 'Evil sabotaged 3 quests, so evil wins.' };
      }
      if (successCount >= 3) {
        return { ...base, phase: 'assassin' };
      }
      return { ...base, phase: 'propose' };
    }

    case 'ASSASSIN_GUESS': {
      const merlin = state.players.find((p) => p.role === 'merlin');
      const target = state.players.find((p) => p.id === action.id);
      const correct = merlin && merlin.id === action.id;
      return {
        ...state,
        assassinGuess: action.id,
        phase: 'end',
        winner: correct ? 'evil' : 'good',
        merlinKilled: correct,
        reason: correct
          ? `${target.name} was Merlin — the Assassin guessed right, so evil wins.`
          : `${target.name} was not Merlin, so good wins.`,
      };
    }
    case 'DISMISS_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

/**
 * Online only: whether `viewerId` is allowed to act in the current phase.
 * Everyone else sees a spectator/waiting view of the same screen.
 */
export function canAct(state, viewerId) {
  if (viewerId == null || !state.players) return false;
  const leaderId = state.players[state.leaderIndex % state.players.length]?.id;
  switch (state.phase) {
    case 'reveal':
      return !state.ready?.[viewerId];
    case 'board':
    case 'propose':
      return viewerId === leaderId;
    case 'vote':
      return state.currentVotes[viewerId] === undefined;
    case 'vote_result':
      return viewerId === leaderId;
    case 'quest': {
      const team = state.quests[state.questIndex]?.team || [];
      return team.includes(viewerId) && state.questCards[viewerId] === undefined;
    }
    case 'quest_result':
      return viewerId === leaderId;
    case 'assassin':
      return state.players.find((p) => p.id === viewerId)?.role === 'assassin';
    case 'end':
      return true;
    default:
      return false;
  }
}

/** Online only: progress text for the waiting states. */
export function waitingOn(state) {
  if (!state.players) return null;
  switch (state.phase) {
    case 'reveal':
      return { done: Object.keys(state.ready || {}).length, total: state.players.length, label: 'ready' };
    case 'vote':
      return { done: Object.keys(state.currentVotes).length, total: state.players.length, label: 'voted' };
    case 'quest': {
      const team = state.quests[state.questIndex]?.team || [];
      return { done: Object.keys(state.questCards).length, total: team.length, label: 'played' };
    }
    default:
      return null;
  }
}
