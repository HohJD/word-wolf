import { useReducer, useEffect } from 'react';
import { validateSetup, assignRoles, createQuests, getQuestSize } from './engine';
import { Lobby, Reveal, Board, Propose, Vote, QuestPlay, Assassin, End } from './screens';
import './styles.css';

const initialState = {
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
  assassinGuess: null,
  winner: null,
  merlinKilled: false,
  reason: '',
  error: null,
};

function init({ players }) {
  const count = Math.min(10, Math.max(5, players.length || 5));
  const names = players.slice(0, count).map((n) => n.trim());
  while (names.length < count) names.push('');
  return { ...initialState, playerCount: count, names };
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
    assassinGuess: null,
    winner: null,
    merlinKilled: false,
    reason: '',
    error: null,
  };
}

function avalonReducer(state, action) {
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
      const error = validateSetup(state.playerCount, state.names, state.roles);
      if (error) return { ...state, error };
      const players = assignRoles(state.names, state.roles);
      return {
        ...resetRoundState(state),
        phase: 'reveal',
        players,
        quests: createQuests(state.playerCount),
      };
    }
    case 'NEW_LOBBY':
      return {
        ...initialState,
        names: state.names,
        playerCount: state.playerCount,
        roles: state.roles,
      };
    case 'CONFIRM_REVEAL':
      return { ...state, revealMode: 'show' };
    case 'HIDE_REVEAL': {
      const next = state.revealIndex + 1;
      if (next >= state.players.length) {
        return { ...state, revealIndex: next, revealMode: 'pass', phase: 'board' };
      }
      return { ...state, revealIndex: next, revealMode: 'pass' };
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
      const next = state.voteIndex + 1;
      if (next >= state.players.length) {
        return { ...state, currentVotes, voteIndex: 0, phase: 'vote_reveal' };
      }
      return { ...state, currentVotes, voteIndex: next };
    }
    case 'REVEAL_VOTES': {
      const votes = state.currentVotes;
      const approve = Object.values(votes).filter((v) => v === 'approve').length;
      const reject = Object.values(votes).filter((v) => v === 'reject').length;
      const result = approve > reject ? 'approved' : 'rejected';
      return { ...state, voteResult: { approve, reject, result }, phase: 'vote_result' };
    }
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

const SCREENS = {
  lobby: Lobby,
  reveal: Reveal,
  board: Board,
  propose: Propose,
  vote: Vote,
  vote_reveal: Vote,
  vote_result: Vote,
  quest: QuestPlay,
  quest_reveal: QuestPlay,
  quest_result: QuestPlay,
  assassin: Assassin,
  end: End,
};

export default function Avalon({ onBack, players = [] }) {
  const [state, dispatch] = useReducer(avalonReducer, { players }, init);
  const Screen = SCREENS[state.phase];

  // The app doesn't reset scroll on navigation, so a scrolled-down Dashboard
  // (or a scrolled-down previous phase) would otherwise carry its scroll
  // position into the next screen, clipping the header/back button.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  return <Screen state={state} dispatch={dispatch} onBack={onBack} />;
}
