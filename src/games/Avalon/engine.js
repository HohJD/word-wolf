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
  merlin: { name: 'Merlin', team: 'good' },
  percival: { name: 'Percival', team: 'good' },
  loyal: { name: 'Loyal Servant', team: 'good' },
  assassin: { name: 'Assassin', team: 'evil' },
  morgana: { name: 'Morgana', team: 'evil' },
  mordred: { name: 'Mordred', team: 'evil' },
  oberon: { name: 'Oberon', team: 'evil' },
  minion: { name: 'Minion', team: 'evil' },
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

export function validateSetup(playerCount, names, roles) {
  if (!AVALON_COUNTS[playerCount]) return 'Avalon requires 5–10 players.';
  if (roles.percival && !roles.merlin) return 'Percival requires Merlin.';
  const [good, evil] = getCounts(playerCount);
  const goodSpecial = (roles.merlin ? 1 : 0) + (roles.percival ? 1 : 0);
  const evilSpecial = 1 + (roles.morgana ? 1 : 0) + (roles.mordred ? 1 : 0) + (roles.oberon ? 1 : 0); // Assassin is always included
  if (goodSpecial > good) return 'Too many good special roles.';
  if (evilSpecial > evil) return 'Too many evil special roles.';
  const nonEmpty = names.filter(Boolean).map((n) => n.trim());
  if (nonEmpty.length < playerCount) return 'Enter every player name.';
  if (new Set(nonEmpty).size !== nonEmpty.length) return 'Names must be unique.';
  return null;
}

export function assignRoles(names, roles) {
  const [goodCount, evilCount] = getCounts(names.length);
  const goodRoles = [];
  const evilRoles = [];
  if (roles.merlin) goodRoles.push('merlin');
  if (roles.percival) goodRoles.push('percival');
  while (goodRoles.length < goodCount) goodRoles.push('loyal');
  evilRoles.push('assassin');
  if (roles.morgana) evilRoles.push('morgana');
  if (roles.mordred) evilRoles.push('mordred');
  if (roles.oberon) evilRoles.push('oberon');
  while (evilRoles.length < evilCount) evilRoles.push('minion');
  const allRoles = shuffle([...goodRoles, ...evilRoles]);
  return names.map((name, i) => ({ id: i, name: name.trim(), role: allRoles[i], team: ROLE_INFO[allRoles[i]].team }));
}

export function getKnowledge(viewer, players) {
  if (viewer.role === 'merlin') {
    return { text: 'Evil (except Mordred)', players: players.filter((p) => p.team === 'evil' && p.role !== 'mordred' && p.id !== viewer.id) };
  }
  if (viewer.role === 'percival') {
    return { text: 'Merlin and Morgana', players: players.filter((p) => p.role === 'merlin' || p.role === 'morgana') };
  }
  if (viewer.team === 'evil' && viewer.role !== 'oberon') {
    return { text: 'Evil (except Oberon)', players: players.filter((p) => p.team === 'evil' && p.role !== 'oberon' && p.id !== viewer.id) };
  }
  return { text: 'No special knowledge', players: [] };
}

export const roleName = (role) => ROLE_INFO[role]?.name || role;
export const teamName = (team) => (team === 'good' ? 'Good' : 'Evil');
