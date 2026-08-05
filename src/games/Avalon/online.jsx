import { useCallback, useEffect, useRef, useState } from 'react';
import { avalonReducer, initialState } from './state';
import { getCounts, evilExtraAvailable } from './engine';
import { SCREENS } from './screenMap';
import Avatar from '../../components/Avatar';
import {
  createRoom, joinRoom, leaveRoom, fetchRoom, mutateRoom, subscribeRoom,
  playerToken, normaliseCode, MIN_SEATS, MAX_SEATS,
} from '../../lib/room';

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
  const token = playerToken();
  const [room, setRoom] = useState(null);
  const [name, setName] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkedSaved, setCheckedSaved] = useState(false);
  const roomRef = useRef(null);
  roomRef.current = room;

  const code = room?.code || null;
  const seats = seatOrder(room?.seats);
  const mySeat = seats.find((s) => s.token === token);
  const isHost = room?.host_token === token;
  const state = room?.state && room.state.phase ? room.state : null;
  const viewer = state?.players && mySeat ? state.players.find((p) => p.id === mySeat.seat) : null;

  useWakeLock(Boolean(state) && state.phase !== 'lobby');

  // Rejoin the room this device was last in — this is what makes a refresh
  // or a phone lock land you back in your own seat instead of a fresh lobby.
  useEffect(() => {
    let alive = true;
    const saved = (() => { try { return localStorage.getItem(ROOM_KEY); } catch { return null; } })();
    if (!saved) { setCheckedSaved(true); return () => { alive = false; }; }
    fetchRoom(saved)
      .then((r) => {
        if (!alive) return;
        if (r && (r.seats || []).some((s) => s.token === token)) setRoom(r);
        else try { localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => { if (alive) setCheckedSaved(true); });
    return () => { alive = false; };
  }, [token]);

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

  const dispatch = useCallback(async (action) => {
    const current = roomRef.current;
    if (!current) return;
    // Apply locally first so the tap feels instant, then reconcile.
    setRoom((r) => (r ? { ...r, state: avalonReducer(r.state, action) } : r));
    try {
      const updated = await mutateRoom(current.code, (fresh) => {
        const next = avalonReducer(fresh.state, action);
        return { state: next, phase: next.phase };
      });
      setRoom((cur) => (cur && updated.version < cur.version ? cur : updated));
    } catch (e) {
      setError(e.message || 'Could not sync — check your connection.');
      fetchRoom(current.code).then((r) => r && setRoom(r)).catch(() => {});
    }
  }, []);

  const remember = (r) => {
    setRoom(r);
    try { localStorage.setItem(ROOM_KEY, r.code); } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name first.');
    setBusy(true); setError(null);
    try {
      remember(await createRoom(name, { ...initialState, mode: 'online', phase: 'lobby' }));
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
      remember(await joinRoom(c, name));
    } catch (e) {
      setError(e.message || 'Could not join that room.');
    } finally { setBusy(false); }
  };

  const handleLeave = async () => {
    if (code) await leaveRoom(code);
    try { localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ }
    setRoom(null);
    onBack();
  };

  const handleStart = () => {
    if (seats.length < MIN_SEATS) return setError(`You need at least ${MIN_SEATS} players.`);
    dispatch({ type: 'START_GAME', names: seats.map((s) => s.name) });
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
                <div key={s.token} className={`avalon-seat${s.token === token ? ' me' : ''}`}>
                  <Avatar name={s.name} size={32} />
                  <span className="avalon-seat-name">{s.name}</span>
                  {s.token === room.host_token && <span className="avalon-seat-tag">Host</span>}
                  {s.token === token && <span className="avalon-seat-tag you">You</span>}
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
      <Screen state={state} dispatch={dispatch} onBack={handleLeave} viewer={viewer} isHost={isHost} />
    </>
  );
}
