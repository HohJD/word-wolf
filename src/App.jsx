import { useReducer, useState } from 'react';
import {
  createInitialState, dealRound, revealNext, submitVote,
  proceedFromReveal, submitWolfGuess, skipVote, playAgain, newSetup,
} from './gameEngine';
import Dashboard from './Dashboard';
import PlayerSetup from './PlayerSetup';
import SetupScreen from './screens/SetupScreen';
import RevealScreen from './screens/RevealScreen';
import DiscussScreen from './screens/DiscussScreen';
import VoteScreen from './screens/VoteScreen';
import RevealRolesScreen from './screens/RevealRolesScreen';
import WolfGuessScreen from './screens/WolfGuessScreen';
import ResultScreen from './screens/ResultScreen';
import TruthOrDare from './games/TruthOrDare';
import WouldYouRather from './games/WouldYouRather';
import MostLikelyTo from './games/MostLikelyTo';
import HotTakes from './games/HotTakes';
import Alias from './games/Alias';
import HelpModal from './components/HelpModal';
import './App.css';

// ── Word Wolf reducer ────────────────────────────────────
function wolfReducer(state, action) {
  switch (action.type) {
    case 'SET_CONFIG': return { ...state, config: { ...state.config, [action.key]: action.val } };
    case 'START_GAME': return dealRound(state);
    case 'REVEAL_NEXT': return revealNext(state);
    case 'START_VOTE': return { ...state, phase: 'VOTE' };
    case 'SUBMIT_VOTE': return submitVote(state, action.votedOutId);
    case 'SKIP_VOTE': return skipVote(state);
    case 'PROCEED_FROM_REVEAL': return proceedFromReveal(state);
    case 'SUBMIT_WOLF_GUESS': return submitWolfGuess(state, action.guess);
    case 'PLAY_AGAIN': return playAgain(state);
    case 'NEW_SETUP': return newSetup(state);
    default: return state;
  }
}

const WOLF_SCREENS = {
  SETUP: SetupScreen,
  REVEAL: RevealScreen,
  DISCUSS: DiscussScreen,
  VOTE: VoteScreen,
  REVEAL_ROLES: RevealRolesScreen,
  WOLF_GUESS: WolfGuessScreen,
  RESULT: ResultScreen,
};

function WordWolfGame({ onBack, players }) {
  const [state, dispatch] = useReducer(wolfReducer, undefined, createInitialState);
  const Screen = WOLF_SCREENS[state.phase];
  return (
    <Screen state={state} dispatch={dispatch} onBack={onBack} players={players} />
  );
}

// ── Root ─────────────────────────────────────────────────
export default function App() {
  const [activeGame, setActiveGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpContext, setHelpContext] = useState('app');

  // Background orbs rendered at root so they persist across screens
  const orbs = (
    <>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
    </>
  );

  const back = () => setActiveGame(null);

  const openHelp = (ctx) => {
    setHelpContext(ctx);
    setShowHelp(true);
  };

  return (
    <div className="app">
      {orbs}

      {showHelp && (
        <HelpModal context={helpContext} onClose={() => setShowHelp(false)} />
      )}

      {activeGame && (
        <button
          className="help-fab"
          onClick={() => openHelp(activeGame)}
          aria-label="Help"
        >
          ?
        </button>
      )}

      {showPlayerSetup && (
        <PlayerSetup
          initial={players}
          onSave={names => { setPlayers(names); setShowPlayerSetup(false); }}
          onClose={() => setShowPlayerSetup(false)}
        />
      )}

      {!activeGame && (
        <Dashboard
          onPlay={setActiveGame}
          players={players}
          onEditPlayers={() => setShowPlayerSetup(true)}
          onHelp={() => openHelp('app')}
        />
      )}

      {activeGame === 'wordwolf'      && <WordWolfGame  onBack={back} players={players} />}
      {activeGame === 'truthordare'   && <TruthOrDare   onBack={back} players={players} />}
      {activeGame === 'wouldyourather'&& <WouldYouRather onBack={back} players={players} />}
      {activeGame === 'mostlikelyto'  && <MostLikelyTo  onBack={back} players={players} />}
      {activeGame === 'hottakes'      && <HotTakes      onBack={back} players={players} />}
      {activeGame === 'alias'         && <Alias         onBack={back} players={players} />}
    </div>
  );
}
