import { useReducer, useEffect, useState, lazy, Suspense } from 'react';
import { avalonReducer, init } from './state';
import { SCREENS } from './screenMap';
import ModeSelect from './ModeSelect';
import { isOnlineConfigured } from '../../lib/onlineConfig';
import './styles.css';

// Loaded on demand so pass-and-play never downloads the Supabase client.
const AvalonOnline = lazy(() => import('./online'));

function AvalonPass({ onBack, players }) {
  const [state, dispatch] = useReducer(avalonReducer, { players, mode: 'pass' }, init);
  const Screen = SCREENS[state.phase];

  // The app doesn't reset scroll on navigation, so a scrolled-down Dashboard
  // (or a scrolled-down previous phase) would otherwise carry its scroll
  // position into the next screen, clipping the header/back button.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase]);

  return <Screen state={state} dispatch={dispatch} onBack={onBack} />;
}

export default function Avalon({ onBack, players = [] }) {
  const [mode, setMode] = useState(null);

  if (!mode) {
    return <ModeSelect onPick={setMode} onBack={onBack} onlineAvailable={isOnlineConfigured} />;
  }
  if (mode === 'online') {
    return (
      <Suspense fallback={<div className="screen avalon-screen"><p className="avalon-waiting-msg">Connecting…</p></div>}>
        <AvalonOnline onBack={() => setMode(null)} />
      </Suspense>
    );
  }
  return <AvalonPass onBack={() => setMode(null)} players={players} />;
}
