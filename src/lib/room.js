import { supabase } from './supabase';

export const MAX_SEATS = 10;
export const MIN_SEATS = 5;

// I/O/0/1 omitted — they get misread when someone reads a code aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;
const TOKEN_KEY = 'ww_player_token';

function randomCode() {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

// A stable per-device id. Seats are keyed by this, which is what makes
// reconnecting after a refresh or a phone lock land you back in your own seat.
export function playerToken() {
  let t = null;
  try {
    t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, t);
    }
  } catch {
    // Private browsing with storage disabled: fall back to a per-session id.
    // Reconnect won't survive a refresh, but play still works.
    t = t || crypto.randomUUID();
  }
  return t;
}

export const normaliseCode = (code) => (code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH);

export async function fetchRoom(code) {
  const { data, error } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Optimistic-concurrency write. The update only lands if `version` still
 * matches what we read, so two phones acting at the same moment can't
 * silently clobber each other — the loser retries against fresh state.
 */
async function tryUpdate(code, expectedVersion, patch) {
  const { data, error } = await supabase
    .from('rooms')
    .update({ ...patch, version: expectedVersion + 1 })
    .eq('code', code)
    .eq('version', expectedVersion)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data; // null when another client got there first
}

/**
 * Re-reads the room and re-applies `mutate` until the write lands.
 * `mutate(room)` returns a patch object, or null to abort with no write.
 */
export async function mutateRoom(code, mutate, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const room = await fetchRoom(code);
    if (!room) throw new Error('Room not found');
    const patch = mutate(room);
    if (!patch) return room;
    const updated = await tryUpdate(code, room.version, patch);
    if (updated) return updated;
    // Ten phones can act on the same instant (everyone voting at once).
    // Randomised backoff stops the retries from re-colliding in lockstep.
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 75 * (i + 1)));
  }
  throw new Error('Room is busy — try again');
}

export async function createRoom(hostName, initialState) {
  const token = playerToken();
  const seats = [{ token, name: hostName.trim(), seat: 0 }];

  // Opportunistic cleanup; a failure here must never block starting a game.
  supabase
    .from('rooms')
    .delete()
    .lt('created_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .then(() => {}, () => {});

  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code, host_token: token, phase: 'lobby', state: initialState, seats, version: 0 })
      .select()
      .maybeSingle();
    if (!error && data) return data;
    // 23505 = unique violation: code already taken, draw another.
    if (error && error.code !== '23505') throw error;
  }
  throw new Error('Could not allocate a room code');
}

export async function joinRoom(code, name) {
  const token = playerToken();
  const trimmed = name.trim();

  return mutateRoom(code, (room) => {
    const seats = Array.isArray(room.seats) ? room.seats : [];
    const mine = seats.find((s) => s.token === token);

    if (mine) {
      // Reconnecting. Only write if the display name actually changed.
      if (mine.name === trimmed) return null;
      return { seats: seats.map((s) => (s.token === token ? { ...s, name: trimmed } : s)) };
    }

    if (room.phase !== 'lobby') throw new Error('That game has already started');
    if (seats.length >= MAX_SEATS) throw new Error('That room is full');
    if (seats.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Someone in the room already has that name');
    }

    return { seats: [...seats, { token, name: trimmed, seat: seats.length }] };
  });
}

export async function leaveRoom(code) {
  const token = playerToken();
  return mutateRoom(code, (room) => {
    const seats = Array.isArray(room.seats) ? room.seats : [];
    if (!seats.some((s) => s.token === token)) return null;
    if (room.phase !== 'lobby') return null; // mid-game: keep the seat for reconnect
    const next = seats.filter((s) => s.token !== token).map((s, i) => ({ ...s, seat: i }));
    return { seats: next };
  }).catch(() => null);
}

/** Push a new game state, guarded by the version we last saw. */
export function pushState(code, expectedVersion, state, phase) {
  return tryUpdate(code, expectedVersion, { state, phase });
}

/**
 * Live updates for one room. Realtime can drop messages on flaky mobile
 * connections, so a slow poll runs alongside it as a safety net.
 */
export function subscribeRoom(code, onChange) {
  const channel = supabase
    .channel(`room:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') onChange(null);
        else onChange(payload.new);
      },
    )
    .subscribe();

  const poll = setInterval(() => {
    fetchRoom(code).then((r) => onChange(r)).catch(() => {});
  }, 5000);

  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
}
