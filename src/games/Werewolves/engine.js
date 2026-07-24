function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const ROLE_INFO = {
  werewolf: {
    name: 'Werewolf', team: 'evil',
    desc: 'Each night, you and the other Werewolves secretly agree on one player to eliminate.',
  },
  villager: {
    name: 'Villager', team: 'good',
    desc: 'You have no special power. Use the day discussion to find the Werewolves.',
  },
  seer: {
    name: 'Seer', team: 'good',
    desc: 'Each night, you may check one player to learn if they are a Werewolf.',
  },
  doctor: {
    name: 'Doctor', team: 'good',
    desc: 'Each night, you may protect one player from being killed by the Werewolves.',
  },
  hunter: {
    name: 'Hunter', team: 'good',
    desc: 'If you die, you immediately take one more player down with you.',
  },
  witch: {
    name: 'Witch', team: 'good',
    desc: 'You have one healing potion and one poison potion. Each can be used once, on any night.',
  },
};

export const OPTIONAL_ROLE_KEYS = ['seer', 'doctor', 'hunter', 'witch'];

export const werewolfCount = (n) => Math.max(1, Math.floor(n / 4));
export const goodSpecialBudget = (n) => n - werewolfCount(n);

export function validateSetup(playerCount, names, roles) {
  if (playerCount < 5) return 'Werewolves needs at least 5 players.';
  const nonEmpty = names.filter(Boolean).map((n) => n.trim()).filter(Boolean);
  if (nonEmpty.length < playerCount) return 'Enter every player name.';
  if (new Set(nonEmpty.map((n) => n.toLowerCase())).size !== nonEmpty.length) return 'Names must be unique.';
  const used = OPTIONAL_ROLE_KEYS.filter((k) => roles[k]).length;
  if (used > goodSpecialBudget(playerCount)) return 'Too many special roles for this many players.';
  return null;
}

export function assignRoles(names, roles) {
  const n = names.length;
  const wCount = werewolfCount(n);
  const goodRoles = OPTIONAL_ROLE_KEYS.filter((k) => roles[k]);
  while (goodRoles.length < n - wCount) goodRoles.push('villager');
  const wolfRoles = Array.from({ length: wCount }, () => 'werewolf');
  const allRoles = shuffle([...goodRoles, ...wolfRoles]);
  return names.map((name, i) => ({
    id: i,
    name: name.trim(),
    role: allRoles[i],
    team: ROLE_INFO[allRoles[i]].team,
    alive: true,
  }));
}

// Werewolves are the only role that gets upfront knowledge (who their allies are).
export function getKnowledge(viewer, players) {
  if (viewer.role !== 'werewolf') return null;
  const allies = players.filter((p) => p.role === 'werewolf' && p.id !== viewer.id);
  if (allies.length === 0) return { text: 'You are the only Werewolf.', players: [] };
  return { text: 'Your fellow Werewolves:', players: allies };
}

export function livingByRole(players, role) {
  return players.find((p) => p.alive && p.role === role) || null;
}

export function checkWinner(players) {
  const alive = players.filter((p) => p.alive);
  const wolvesAlive = alive.filter((p) => p.role === 'werewolf').length;
  const goodAlive = alive.length - wolvesAlive;
  if (wolvesAlive === 0) return 'good';
  if (wolvesAlive >= goodAlive) return 'evil';
  return null;
}

export const roleName = (role) => ROLE_INFO[role]?.name || role;
export const roleDesc = (role) => ROLE_INFO[role]?.desc || '';
export const teamName = (team) => (team === 'good' ? 'Good' : 'Evil');
