import { useCallback, useEffect, useRef, useState } from 'react';
import { avalonReducer, initialState } from './state';
import { getCounts, evilExtraAvailable } from './engine';
import { SCREENS } from './screenMap';
import Avatar from '../../components/Avatar';
import {
  createRoom, joinRoom, leaveRoom, closeRoom, fetchRoom, mutateRoom, subscribeRoom,
  myRole, mySeat, dealGame, submitAction, assassinGuess, revealRoles,
  normaliseCode, MIN_SEATS, MAX_SEATS,
} from '../../lib/room';

// Round keys scope a batch of secret submissions. A new proposal or a new
// quest starts a fresh batch, so stale votes can never bleed across rounds.
const voteKey  = (st) => `v-${st.questIndex}-${st.rejectCount}-${st.leaderIndex}`;
const questKey = (st) => `q-${st.questIndex}`;

const ROOM_KEY = 'ww_avalon_room';

const OPTIONAL_ROLES = [
  { key: 'percival', label: 'Percival & Morgana', desc: 'Percival can spot Merlin — but Morgana looks the same to him.' },
  { key: 'mordred', label: 'Mordred', desc: 'An evil player that even Merlin can’t see.' },
  { key: 'oberon', label: 'Oberon', desc: 'An evil player who doesn’t know the other evil players, and isn’t known by them.' },
];

const seatOrder = (seats) => [...(seats || [])].sort((a, b) => a.seat - b.seat);

/** Keeps the screen awake while a game is in progress. */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = () => navigator.wakeLock.request('screen').then(
      (l) => { if (cancelled) l.release(); else lock = l; },
      () => {},
    );
    acquire();
    // iOS drops the lock whenever the tab is backgrounded.
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}

export default function AvalonOnline({ onBack }) {
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);        // { seat, name, isHost }
  const [secret, setSecret] = useState(null); // { seat, role, team, knows }
  const [finalRoles, setFinalRoles] = useState(null);
  const [name, setName] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkedSaved, setCheckedSaved] = useState(false);
  const roomRef = useRef(null);
  roomRef.current = room;

  const code = room?.code || null;
  const seats = seatOrder(room?.seats);
  const isHost = Boolean(me?.isHost);
  const state = room?.state && room.state.phase ? room.state : null;

  // The public row knows names only. Role and private knowledge come from
  // the server, scoped to this device's token.
  const viewer = state?.players && secret
    ? { ...state.players[secret.seat], role: secret.role, team: secret.team, knows: secret.knows }
    : null;

  useWakeLock(Boolean(state) && state.phase !== 'lobby');

  // Rejoin the room this device was last in — this is what makes a refresh
  // or a phone lock land you back in your own seat instead of a fresh lobby.
  useEffect(() => {
    let alive = true;
    const saved = (() => { try { return localStorage.getItem(ROOM_KEY); } catch { return null; } })();
    if (!saved) { setCheckedSaved(true); return () => { alive = false; }; }
    (async () => {
      try {
        const seat = await mySeat(saved);   // server decides if this device has a seat
        if (!alive) return;
        if (seat) {
          setMe(seat);
          const r = await fetchRoom(saved);
          if (alive && r) setRoom(r);
        } else {
          try { localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ }
        }
      } catch { /* offline; fall through to the entry screen */ }
      if (alive) setCheckedSaved(true);
    })();
    return () => { alive = false; };
  }, []);

  // Fetch this device's role once the game is dealt. Re-fetched on a new
  // deal so "play again" hands out fresh roles.
  const dealtAt = state && state.phase !== 'lobby' && state.players ? state.players.length : 0;
  const isRevealPhase = state?.phase === 'reveal';
  useEffect(() => {
    if (!code || !dealtAt) { setSecret(null); return undefined; }
    let alive = true;
    myRole(code).then((r) => { if (alive) setSecret(r); }).catch(() => {});
    return () => { alive = false; };
  }, [code, dealtAt, isRevealPhase]);

  // Everyone's role, but only once the game is actually over.
  const phase = state?.phase;
  useEffect(() => {
    if (!code || phase !== 'end') { setFinalRoles(null); return undefined; }
    let alive = true;
    revealRoles(code).then((r) => { if (alive) setFinalRoles(r); }).catch(() => {});
    return () => { alive = false; };
  }, [code, phase]);

  // Live room updates. Version guard stops a slow poll response from
  // overwriting a newer state we already applied optimistically.
  useEffect(() => {
    if (!code) return undefined;
    return subscribeRoom(code, (next) => {
      if (!next) {
        setRoom(null);
        setError('The host closed this room.');
        try { localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ }
        return;
      }
      setRoom((cur) => (cur && next.version < cur.version ? cur : next));
    });
  }, [code]);

  const refresh = useCallback((c) => {
    fetchRoom(c).then((r) => r && setRoom((cur) => (cur && r.version < cur.version ? cur : r)))
      .catch(() => {});
  }, []);

  /**
   * Public transitions run the shared reducer against the room row.
   * Anything secret — dealing, votes, quest cards, the assassination — is
   * routed to a server function instead, because the client is not allowed
   * to know enough to compute it.
   */
  const dispatch = useCallback(async (action) => {
    const current = roomRef.current;
    if (!current) return;
    const st = current.state;

    try {
      switch (action.type) {
        case 'START_GAME':
          await dealGame(current.code);
          return refresh(current.code);
        case 'CAST_VOTE':
          await submitAction(current.code, voteKey(st), 'vote', action.vote);
          return refresh(current.code);
        case 'PLAY_QUEST_CARD':
          await submitAction(current.code, questKey(st), 'quest', action.card);
          return refresh(current.code);
        case 'ASSASSIN_GUESS':
          await assassinGuess(current.code, action.id);
          return refresh(current.code);
        default:
          break;
      }

      // Public transition: apply locally first so the tap feels instant.
      setRoom((r) => (r ? { ...r, state: avalonReducer(r.state, action) } : r));
      const updated = await mutateRoom(current.code, (fresh) => {
        const next = avalonReducer(fresh.state, action);
        return { state: next, phase: next.phase };
      });
      setRoom((cur) => (cur && updated.version < cur.version ? cur : updated));
    } catch (e) {
      setError(e.message || 'Could not sync — check your connection.');
      refresh(current.code);
    }
  }, [refresh]);

  const remember = async (res) => {
    setMe({ seat: res.seat, isHost: res.isHost });
    try { localStorage.setItem(ROOM_KEY, res.code); } catch { /* ignore */ }
    const r = await fetchRoom(res.code);
    if (r) setRoom(r);
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name first.');
    setBusy(true); setError(null);
    try {
      await remember(await createRoom(name, { ...initialState, mode: 'online', phase: 'lobby' }));
    } catch (e) {
      setError(e.message || 'Could not create a room.');
    } finally { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name first.');
    const c = normaliseCode(codeInput);
    if (c.length !== 4) return setError('Room codes are 4 letters.');
    setBusy(true); setError(null);
    try {
      await remember(await joinRoom(c, name));
    } catch (e) {
      setError(e.message || 'Could not join that room.');
    } finally { setBusy(false); }
  };

  const handleLeave = async () => {
    if (code) {
      // The host closing ends the game for everyone; anyone else just
      // gives up their lobby seat.
      if (isHost && state?.phase === 'lobby') await closeRoom(code);
      else await leaveRoom(code);
    }
    try { localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ }
    setRoom(null); setMe(null); setSecret(null); setFinalRoles(null);
    onBack();
  };

  const handleStart = () => {
    if (seats.length < MIN_SEATS) return setError(`You need at least ${MIN_SEATS} players.`);
    dispatch({ type: 'START_GAME' });
  };

  const share = async () => {
    const text = `Join my Avalon game — room code ${code}\n${window.location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Avalon', text });
      else await navigator.clipboard.writeText(text);
    } catch { /* user dismissed the sheet */ }
  };

  // ── Entry: create or join ────────────────────────────────
  if (!room) {
    return (
      <div className="screen avalon-screen avalon-lobby view-enter">
        <div className="avalon-hero">
          <button className="back-btn" onClick={onBack}>← Back</button>
          <span className="avalon-castle">🏰</span>
          <h1 className="avalon-title">Play Online</h1>
          <p className="avalon-subtitle">Everyone plays on their own phone.</p>
        </div>

        <div className="avalon-card">
          <div className="avalon-field">
            <label htmlFor="ava-name">Your name</label>
            <input
              id="ava-name"
              className="avalon-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              maxLength={20}
              autoComplete="given-name"
            />
          </div>

          <button className="btn-primary avalon-start" disabled={busy || !checkedSaved} onClick={handleCreate}>
            Create a room
          </button>

          <div className="avalon-or"><span>or</span></div>

          <div className="avalon-field">
            <label htmlFor="ava-code">Room code</label>
            <input
              id="ava-code"
              className="avalon-input avalon-code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(normaliseCode(e.target.value))}
              placeholder="ABCD"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={4}
            />
          </div>
          <button className="btn-secondary avalon-start" disabled={busy} onClick={handleJoin}>
            Join room
          </button>

          {error && <p className="avalon-error">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Lobby ────────────────────────────────────────────────
  if (!state || state.phase === 'lobby') {
    const roles = state?.roles || initialState.roles;
    const [good, evil] = getCounts(Math.max(MIN_SEATS, seats.length));
    const extra = evilExtraAvailable(Math.max(MIN_SEATS, seats.length));
    const used = OPTIONAL_ROLES.reduce((n, r) => n + (roles[r.key] ? 1 : 0), 0);
    const enough = seats.length >= MIN_SEATS;

    return (
      <div className="screen avalon-screen avalon-lobby view-enter">
        <div className="avalon-hero">
          <button className="back-btn" onClick={handleLeave}>← Leave</button>
          <span className="avalon-castle">🏰</span>
          <h1 className="avalon-title">Room {code}</h1>
          <p className="avalon-subtitle">Share this code so friends can join.</p>
        </div>

        <button className="avalon-code-badge" onClick={share}>
          <span className="avalon-code-value">{code}</span>
          <span className="avalon-code-hint">Tap to share</span>
        </button>

        <div className="avalon-card">
          <div className="avalon-field">
            <label>Players ({seats.length}/{MAX_SEATS})</label>
            <div className="avalon-seats">
              {seats.map((s) => (
                // Seats carry no tokens now, so identity is by seat number:
                // the creator holds seat 0, and the server told us ours.
                <div key={s.seat} className={`avalon-seat${s.seat === me?.seat ? ' me' : ''}`}>
                  <Avatar name={s.name} size={32} />
                  <span className="avalon-seat-name">{s.name}</span>
                  {s.seat === 0 && <span className="avalon-seat-tag">Host</span>}
                  {s.seat === me?.seat && <span className="avalon-seat-tag you">You</span>}
                </div>
              ))}
              {Array.from({ length: Math.max(0, MIN_SEATS - seats.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="avalon-seat empty">
                  <span className="avalon-seat-name">Waiting…</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="avalon-field">
              <label>Optional Roles</label>
              <p className="avalon-note avalon-note-standalone">Merlin and the Assassin are always included.</p>
              <div className="avalon-toggle-list">
                {OPTIONAL_ROLES.map((r) => {
                  const active = roles[r.key];
                  const disabled = !active && used + 1 > extra;
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
          )}

          {enough && (
            <div className="avalon-balance">
              <span className="avalon-good">Good {good}</span>
              <span className="avalon-vs">vs</span>
              <span className="avalon-evil">Evil {evil}</span>
            </div>
          )}

          {(error || state?.error) && <p className="avalon-error">{error || state.error}</p>}
        </div>

        {isHost ? (
          <button className="btn-primary avalon-start" disabled={!enough} onClick={handleStart}>
            {enough ? 'Start Game' : `Need ${MIN_SEATS - seats.length} more player${MIN_SEATS - seats.length === 1 ? '' : 's'}`}
          </button>
        ) : (
          <p className="avalon-waiting-msg">Waiting for the host to start…</p>
        )}
      </div>
    );
  }

  // ── In game ──────────────────────────────────────────────
  const Screen = SCREENS[state.phase];
  if (!Screen) return null;

  if (!viewer) {
    return (
      <div className="screen avalon-screen view-enter">
        <p className="avalon-waiting-msg">This game started without you. Ask the host for the next round.</p>
        <button className="btn-secondary avalon-start" onClick={handleLeave}>Leave room</button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="avalon-error avalon-error-float" onClick={() => setError(null)}>{error}</p>}
      <Screen
        state={finalRoles ? { ...state, players: state.players.map((p) => {
          const r = finalRoles.find((f) => f.seat === p.id);
          return r ? { ...p, role: r.role, team: r.team } : p;
        }) } : state}
        dispatch={dispatch}
        onBack={handleLeave}
        viewer={viewer}
        isHost={isHost}
      />
    </>
  );
}
