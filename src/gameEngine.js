import { pickRandomPair } from "./wordPairs";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(n, k) {
  const indices = Array.from({ length: n }, (_, i) => i);
  return shuffle(indices).slice(0, k);
}

export function createInitialState() {
  return {
    phase: "SETUP",
    config: {
      playerCount: 5,
      wolfCount: 1,
      category: "Food & Drink",
      timerSeconds: 180,
      wolfMode: "word", // "word" | "blank"
    },
    round: null,
    usedPairs: [],
  };
}

export function dealRound(state) {
  const { config, usedPairs } = state;
  const pair = pickRandomPair(config.category, usedPairs);

  const roles = Array(config.playerCount).fill("villager");
  const wolfIndices = pickRandom(config.playerCount, config.wolfCount);
  wolfIndices.forEach((i) => (roles[i] = "wolf"));

  const players = roles.map((role, i) => ({
    id: i + 1,
    role,
    word:
      role === "wolf"
        ? config.wolfMode === "blank"
          ? "???"
          : pair.wolf
        : pair.villager,
    revealed: false,
  }));

  return {
    ...state,
    phase: "REVEAL",
    round: {
      villagerWord: pair.villager,
      wolfWord: pair.wolf,         // always stored for the result reveal
      wolfMode: config.wolfMode,   // carried into round for display logic
      players: shuffle(players).map((p, i) => ({ ...p, id: i + 1 })),
      revealIndex: 0,
      votedOutId: null,
      wolfGuess: null,
      winner: null,
    },
    usedPairs: [...usedPairs, pair],
  };
}

export function revealNext(state) {
  const { round } = state;
  const next = round.revealIndex + 1;
  if (next >= round.players.length) {
    return { ...state, phase: "DISCUSS" };
  }
  return {
    ...state,
    round: { ...round, revealIndex: next },
  };
}

export function submitVote(state, votedOutId) {
  return {
    ...state,
    phase: "REVEAL_ROLES",
    round: { ...state.round, votedOutId },
  };
}

export function proceedFromReveal(state) {
  const { round } = state;
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  if (votedOut && votedOut.role === "wolf") {
    return { ...state, phase: "WOLF_GUESS" };
  }
  const winner = determineWinner(state);
  return { ...state, phase: "RESULT", round: { ...round, winner } };
}

export function submitWolfGuess(state, guess) {
  const { round } = state;
  const correct =
    guess.trim().toLowerCase() === round.villagerWord.toLowerCase();
  const winner = correct ? "wolves" : "villagers";
  return {
    ...state,
    phase: "RESULT",
    round: { ...round, wolfGuess: guess, winner },
  };
}

function determineWinner(state) {
  const { round } = state;
  const votedOut = round.players.find((p) => p.id === round.votedOutId);
  if (!votedOut) return "wolves";
  if (votedOut.role === "wolf") return "villagers";
  return "wolves";
}

export function skipVote(state) {
  return {
    ...state,
    phase: "RESULT",
    round: { ...state.round, winner: "wolves" },
  };
}

export function playAgain(state) {
  return dealRound({
    ...state,
    phase: "SETUP",
    round: null,
  });
}

export function newSetup(state) {
  return { ...createInitialState(), config: state.config };
}
