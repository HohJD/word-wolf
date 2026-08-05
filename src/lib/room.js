import { supabase } from './supabase';

export const MAX_SEATS = 10;
export const MIN_SEATS = 5;

const TOKEN_KEY = 'ww_player_token';
const CODE_LENGTH = 4;

/**
 * A stable per-device id, and the credential the server uses to decide what
 * this player is allowed to know. It is never written to the shared room row
 * — publishing it would let anyone look up anyone else's role.
 */
export function playerToken() {
  let t = null;
  try {
    t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, t);
    }
  } catch {
    // Private browsing with storage disabled: per-session id. Play works,
    // reconnect across a refresh does not.
    t = t || crypto.randomUUID();
  }
  return t;
}

export const normaliseCode = (code) =>
  (code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH);

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message || 'Something went wrong');
  return data;
};

export async function fetchRoom(code) {
  const { data, error } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

// ── Membership (all server-side; clients cannot write rooms directly) ──

export const createRoom = (name, initialState) =>
  supabase.rpc('create_room', { p_token: playerToken(), p_name: name.trim(), p_state: initialState })
    .then(unwrap);

export const joinRoom = (code, name) =>
  supabase.rpc('join_room', { p_code: code, p_token: playerToken(), p_name: name.trim() })
    .then(unwrap);

export const mySeat = (code) =>
  supabase.rpc('my_seat', { p_code: code, p_token: playerToken() }).then(unwrap);

export const leaveRoom = (code) =>
  supabase.rpc('leave_room', { p_code: code, p_token: playerToken() })
    .then(unwrap).catch(() => null);

export const closeRoom = (code) =>
  supabase.rpc('close_room', { p_code: code, p_token: playerToken() })
    .then(unwrap).catch(() => null);

// ── Secrets: each device learns only its own ──────────────────────────

export const myRole = (code) =>
  supabase.rpc('my_role', { p_code: code, p_token: playerToken() }).then(unwrap);

export const dealGame = (code) =>
  supabase.rpc('deal_avalon', { p_code: code, p_token: playerToken() }).then(unwrap);

/**
 * Votes and quest cards go straight to a table the anon key cannot read.
 * The server resolves the round in the same call that completes it, so no
 * client ever has to notice "everyone is in" and race to publish the result.
 */
export const submitAction = (code, roundKey, kind, value) =>
  supabase.rpc('submit_action', {
    p_code: code, p_token: playerToken(), p_round: roundKey, p_kind: kind, p_value: value,
  }).then(unwrap);

export const assassinGuess = (code, targetSeat) =>
  supabase.rpc('assassin_guess', { p_code: code, p_token: playerToken(), p_target: targetSeat })
    .then(unwrap);

export const revealRoles = (code) =>
  supabase.rpc('reveal_roles', { p_code: code }).then(unwrap);

// ── Public state ──────────────────────────────────────────────────────

/**
 * Optimistic-concurrency write for the public parts of the game (proposals,
 * phase advances). Secret transitions never come through here.
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

export async function mutateRoom(code, mutate, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const room = await fetchRoom(code);
    if (!room) throw new Error('Room not found');
    const patch = mutate(room);
    if (!patch) return room;
    const updated = await tryUpdate(code, room.version, patch);
    if (updated) return updated;
    // Ten phones can act on the same instant. Randomised backoff stops the
    // retries from re-colliding in lockstep.
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 75 * (i + 1)));
  }
  throw new Error('Room is busy — try again');
}

/**
 * Live updates for one room. Realtime can drop messages on flaky mobile
 * connections, and a cold socket can miss its first event, so a slow poll
 * runs alongside it as a safety net.
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
