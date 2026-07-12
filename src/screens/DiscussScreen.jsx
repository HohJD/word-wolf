import { useState, useEffect, useRef } from "react";

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function DiscussScreen({ state, dispatch }) {
  const total = state.config.timerSeconds;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);
  const chimeRef = useRef(false);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1;
          if (next === 30 && !chimeRef.current) {
            chimeRef.current = true;
            playChime();
          }
          if (next <= 0) {
            setRunning(false);
          }
          return Math.max(0, next);
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  const pct = remaining / total;
  const urgent = remaining <= 30 && remaining > 0;
  const done = remaining === 0;

  const radius = 80;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="screen discuss-screen">
      <h2 className="screen-title">Discussion</h2>
      <p className="screen-sub">
        Describe your word without saying it. Find the wolf!
      </p>

      <div className="timer-wrap">
        <svg className="timer-svg" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--surface2)"
            strokeWidth="10"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={done ? "var(--error)" : urgent ? "var(--warn)" : "var(--accent)"}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className={`timer-text ${urgent ? "urgent" : ""} ${done ? "done" : ""}`}>
          {done ? "Time's up!" : formatTime(remaining)}
        </div>
      </div>

      <div className="btn-row">
        <button
          className="btn-ghost"
          onClick={() => setRunning((r) => !r)}
          disabled={done}
        >
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
      </div>

      {(done) && (
        <p className="time-up-msg">Put the phone down and vote!</p>
      )}

      <button
        className="btn-primary"
        onClick={() => dispatch({ type: "START_VOTE" })}
      >
        Vote now →
      </button>
    </div>
  );
}
