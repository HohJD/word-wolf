function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AVALON_COUNTS = { 5: [3, 2], 6: [4, 2], 7: [4, 3], 8: [5, 3], 9: [6, 3], 10: [6, 4] };

const AVALON_QUEST_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

const AVALON_QUEST_FAILS = {
  5: [1, 1, 1, 1, 1],
  6: [1, 1, 1, 1, 1],
  7: [1, 1, 1, 2, 1],
  8: [1, 1, 1, 2, 1],
  9: [1, 1, 1, 2, 1],
  10: [1, 1, 1, 2, 1],
};

export const ROLE_INFO = {
  merlin: {
    name: 'Merlin', team: 'good',
    desc: 'You can see who the evil players are (Mordred is hidden from you, if playing). Don’t make it obvious you know.',
  },
  percival: {
    name: 'Percival', team: 'good',
    desc: 'You see two players below. One is Merlin, one is Morgana — you won’t know which is which.',
  },
  loyal: {
    name: 'Loyal Servant', team: 'good',
    desc: 'You have no special knowledge. Listen closely and use logic to find the evil players.',
  },
  assassin: {
    name: 'Assassin', team: 'evil',
    desc: 'If good wins 3 quests, you get one guess at who Merlin is. Guess right and evil wins instead.',
  },
  morgana: {
    name: 'Morgana', team: 'evil',
    desc: 'To Percival, you look exactly like Merlin. Use that to confuse him.',
  },
  mordred: {
    name: 'Mordred', team: 'evil',
    desc: 'Merlin cannot see that you’re evil — you’re the one evil player hidden from Merlin.',
  },
  oberon: {
    name: 'Oberon', team: 'evil',
    desc: 'You don’t know who the other evil players are, and they don’t know you either.',
  },
  minion: {
    name: 'Minion', team: 'evil',
    desc: 'You know who the other evil players are. Work together to make quests fail.',
  },
};

export const getCounts = (n) => AVALON_COUNTS[n] || AVALON_COUNTS[5];
export const getQuestSize = (n, i) => (AVALON_QUEST_SIZES[n] || AVALON_QUEST_SIZES[5])[i] ?? 2;
export const getRequiredFails = (n, i) => (AVALON_QUEST_FAILS[n] || AVALON_QUEST_FAILS[5])[i] ?? 1;
export const createQuests = (n) =>
  (AVALON_QUEST_SIZES[n] || AVALON_QUEST_SIZES[5]).map((size, i) => ({
    size,
    requiredFails: (AVALON_QUEST_FAILS[n] || AVALON_QUEST_FAILS[5])[i],
    team: [],
    votes: {},
    cards: {},
    result: 'pending',
  }));

// Merlin + Assassin are always in play. Percival & Morgana are a pair —
// enabling one always enables the other, since Percival's ambiguity
// only means anything with Morgana present to imitate Merlin.
export const evilExtraAvailable = (n) => getCounts(n)[1] - 1;

export function validateSetup(playerCount, names, roles) {
  if (!AVALON_COUNTS[playerCount]) return 'Avalon requires 5–10 players.';
  const nonEmpty = names.filter(Boolean).map((n) => n.trim()).filter(Boolean);
  if (nonEmpty.length < playerCount) return 'Enter every player name.';
  if (new Set(nonEmpty.map((n) => n.toLowerCase())).size !== nonEmpty.length) return 'Names must be unique.';
  const used = (roles.percival ? 1 : 0) + (roles.mordred ? 1 : 0) + (roles.oberon ? 1 : 0);
  if (used > evilExtraAvailable(playerCount)) return 'Too many special evil roles for this many players.';
  return null;
}

export function assignRoles(names, roles) {
  const [goodCount, evilCount] = getCounts(names.length);
  const goodRoles = ['merlin'];
  const evilRoles = ['assassin'];
  if (roles.percival) { goodRoles.push('percival'); evilRoles.push('morgana'); }
  if (roles.mordred) evilRoles.push('mordred');
  if (roles.oberon) evilRoles.push('oberon');
  while (goodRoles.length < goodCount) goodRoles.push('loyal');
  while (evilRoles.length < evilCount) evilRoles.push('minion');
  const allRoles = shuffle([...goodRoles, ...evilRoles]);
  return names.map((name, i) => ({
    id: i,
    name: name.trim(),
    role: allRoles[i],
    team: ROLE_INFO[allRoles[i]].team,
  }));
}

// Returns { text, players, lonely } describing what a player privately sees.
export function getKnowledge(viewer, players) {
  if (viewer.role === 'merlin') {
    return {
      text: 'These players are evil:',
      players: players.filter((p) => p.team === 'evil' && p.role !== 'mordred' && p.id !== viewer.id),
    };
  }
  if (viewer.role === 'percival') {
    return {
      text: 'One of these is Merlin, the other is Morgana:',
      players: shuffle(players.filter((p) => p.role === 'merlin' || p.role === 'morgana')),
    };
  }
  if (viewer.team === 'evil' && viewer.role !== 'oberon') {
    const allies = players.filter((p) => p.team === 'evil' && p.role !== 'oberon' && p.id !== viewer.id);
    if (allies.length === 0) {
      return { text: 'You don’t know who the other evil players are.', players: [], lonely: true };
    }
    return { text: 'These players are also evil:', players: allies };
  }
  return { text: 'You have no special knowledge.', players: [] };
}

export const roleName = (role) => ROLE_INFO[role]?.name || role;
export const roleDesc = (role) => ROLE_INFO[role]?.desc || '';
export const teamName = (team) => (team === 'good' ? 'Good' : 'Evil');
