import { useReducer, useEffect } from 'react';
import { validateSetup, assignRoles, livingByRole, checkWinner } from './engine';
import { Lobby, Reveal, NightWolves, NightSeer, NightDoctor, NightWitch, DayReveal, DayVote, DayResult, End } from './screens';
import './styles.css';

const initialState = {
  phase: 'lobby',
  playerCount: 6,
  names: [],
  roles: { seer: true, doctor: true, hunter: false, witch: false },
  players: null,
  round: 1,
  revealIndex: 0,
  revealMode: 'pass',

  nightVictim: null,
  seerResult: null,
  seerRevealed: false,
  doctorProtect: null,
  witchHealUsed: false,
  witchPoisonUsed: false,
  witchHealChoice: false,
  witchPoisonChoice: null,
  witchHealedThisRound: false,
  witchPoisonTarget: null,

  nightDeaths: [],
  hunterPending: null,
  voteMarks: {},
  voteResult: null,

  winner: null,
  error: null,
};

function init({ players }) {
  const count = Math.max(5, players.length || 6);
  const names = players.slice(0, count).map((n) => n.trim());
  while (names.length < count) names.push('');
  return { ...initialState, playerCount: count, names };
}

function resetRoundState(state) {
  return {
    ...state,
    round: 1,
    revealIndex: 0,
    revealMode: 'pass',
    nightVictim: null,
    seerResult: null,
    seerRevealed: false,
    doctorProtect: null,
    witchHealUsed: false,
    witchPoisonUsed: false,
    witchHealChoice: false,
    witchPoisonChoice: null,
    witchHealedThisRound: false,
    witchPoisonTarget: null,
    nightDeaths: [],
    hunterPending: null,
    voteMarks: {},
    voteResult: null,
    winner: null,
    error: null,
  };
}

function nextNightStep(state, from) {
  const seer = livingByRole(state.players, 'seer');
  const doctor = livingByRole(state.players, 'doctor');
  const witch = livingByRole(state.players, 'witch');
  const witchHasPotion = witch && (!state.witchHealUsed || !state.witchPoisonUsed);

  if (from === 'wolves') {
    if (seer) return 'night_seer';
    if (doctor) return 'night_doctor';
    if (witchHasPotion) return 'night_witch';
    return 'resolve';
  }
  if (from === 'seer') {
    if (doctor) return 'night_doctor';
    if (witchHasPotion) return 'night_witch';
    return 'resolve';
  }
  if (from === 'doctor') {
    if (witchHasPotion) return 'night_witch';
    return 'resolve';
  }
  return 'resolve';
}

function resolveNight(state) {
  const dead = new Set();
  if (state.nightVictim != null) {
    const savedByDoctor = state.doctorProtect === state.nightVictim;
    const savedByWitch = state.witchHealedThisRound;
    if (!savedByDoctor && !savedByWitch) dead.add(state.nightVictim);
  }
  if (state.witchPoisonTarget != null) dead.add(state.witchPoisonTarget);

  const deadIds = Array.from(dead);
  const players = state.players.map((p) => (deadIds.includes(p.id) ? { ...p, alive: false } : p));
  const nightDeaths = deadIds.map((id) => {
    const p = players.find((x) => x.id === id);
    return { id: p.id, name: p.name, role: p.role };
  });
  const hunter = nightDeaths.find((d) => d.role === 'hunter');

  return {
    ...state,
    players,
    nightDeaths,
    hunterPending: hunter ? hunter.id : null,
    phase: 'day_reveal',
  };
}

function applyHunterRevenge(state, targetId) {
  const target = state.players.find((p) => p.id === targetId);
  const players = state.players.map((p) => (p.id === targetId ? { ...p, alive: false } : p));
  const entry = { id: target.id, name: target.name, role: target.role };
  if (state.phase === 'day_reveal') {
    return { ...state, players, hunterPending: null, nightDeaths: [...state.nightDeaths, entry] };
  }
  return { ...state, players, hunterPending: null, voteResult: { ...state.voteResult, revenge: entry } };
}

function werewolvesReducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER_COUNT': {
      const count = Math.max(5, action.count);
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
      return { ...resetRoundState(state), phase: 'reveal', players };
    }
    case 'NEW_LOBBY':
      return { ...initialState, names: state.names, playerCount: state.playerCount, roles: state.roles };

    case 'CONFIRM_REVEAL':
      return { ...state, revealMode: 'show' };
    case 'HIDE_REVEAL': {
      const next = state.revealIndex + 1;
      if (next >= state.players.length) {
        return { ...state, revealIndex: next, revealMode: 'pass', phase: 'night_wolves' };
      }
      return { ...state, revealIndex: next, revealMode: 'pass' };
    }

    case 'WOLF_PICK': {
      const phase = nextNightStep(state, 'wolves');
      const withVictim = { ...state, nightVictim: action.id };
      return phase === 'resolve' ? resolveNight(withVictim) : { ...withVictim, phase };
    }
    case 'SEER_PICK': {
      const target = state.players.find((p) => p.id === action.id);
      return { ...state, seerResult: { id: target.id, name: target.name, isWerewolf: target.role === 'werewolf' }, seerRevealed: true };
    }
    case 'SEER_CONTINUE': {
      const phase = nextNightStep(state, 'seer');
      const cleared = { ...state, seerResult: null, seerRevealed: false };
      return phase === 'resolve' ? resolveNight(cleared) : { ...cleared, phase };
    }
    case 'DOCTOR_PICK': {
      const phase = nextNightStep(state, 'doctor');
      const withProtect = { ...state, doctorProtect: action.id };
      return phase === 'resolve' ? resolveNight(withProtect) : { ...withProtect, phase };
    }
    case 'WITCH_TOGGLE_HEAL':
      if (state.witchHealUsed) return state;
      return { ...state, witchHealChoice: !state.witchHealChoice };
    case 'WITCH_SET_POISON':
      if (state.witchPoisonUsed) return state;
      return { ...state, witchPoisonChoice: state.witchPoisonChoice === action.id ? null : action.id };
    case 'WITCH_CONFIRM': {
      const healedNow = state.witchHealChoice;
      const poisonNow = state.witchPoisonChoice;
      const withWitch = {
        ...state,
        witchHealUsed: state.witchHealUsed || healedNow,
        witchPoisonUsed: state.witchPoisonUsed || poisonNow != null,
        witchHealedThisRound: healedNow,
        witchPoisonTarget: poisonNow,
      };
      return resolveNight(withWitch);
    }

    case 'HUNTER_REVENGE':
      return applyHunterRevenge(state, action.id);

    case 'CONTINUE_FROM_NIGHT': {
      const winner = checkWinner(state.players);
      if (winner) return { ...state, phase: 'end', winner };
      return { ...state, phase: 'day_vote', voteMarks: {} };
    }

    case 'CAST_VOTE':
      return { ...state, voteMarks: { ...state.voteMarks, [action.voterId]: action.targetId } };
    case 'CLEAR_VOTE': {
      const voteMarks = { ...state.voteMarks };
      delete voteMarks[action.voterId];
      return { ...state, voteMarks };
    }
    case 'REVEAL_VOTE_RESULT': {
      const tally = {};
      Object.values(state.voteMarks).forEach((targetId) => {
        tally[targetId] = (tally[targetId] || 0) + 1;
      });
      let top = [];
      let max = 0;
      Object.entries(tally).forEach(([id, count]) => {
        const n = Number(id);
        if (count > max) { max = count; top = [n]; }
        else if (count === max) top.push(n);
      });
      const eliminatedId = top.length === 1 ? top[0] : null;
      let players = state.players;
      let eliminated = null;
      let hunterPending = null;
      if (eliminatedId != null) {
        const target = state.players.find((p) => p.id === eliminatedId);
        players = state.players.map((p) => (p.id === eliminatedId ? { ...p, alive: false } : p));
        eliminated = { id: target.id, name: target.name, role: target.role };
        if (target.role === 'hunter') hunterPending = target.id;
      }
      return {
        ...state,
        players,
        phase: 'day_result',
        voteResult: { tally, eliminated, tie: eliminatedId == null && top.length > 1 },
        hunterPending,
      };
    }

    case 'CONTINUE_FROM_DAY': {
      const winner = checkWinner(state.players);
      if (winner) return { ...state, phase: 'end', winner };
      return {
        ...state,
        round: state.round + 1,
        phase: 'night_wolves',
        nightVictim: null,
        doctorProtect: null,
        witchHealedThisRound: false,
        witchPoisonTarget: null,
        witchHealChoice: false,
        witchPoisonChoice: null,
        nightDeaths: [],
        voteResult: null,
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
  night_wolves: NightWolves,
  night_seer: NightSeer,
  night_doctor: NightDoctor,
  night_witch: NightWitch,
  day_reveal: DayReveal,
  day_vote: DayVote,
  day_result: DayResult,
  end: End,
};

export default function Werewolves({ onBack, players = [] }) {
  const [state, dispatch] = useReducer(werewolvesReducer, { players }, init);
  const Screen = SCREENS[state.phase];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  return <Screen state={state} dispatch={dispatch} onBack={onBack} />;
}
