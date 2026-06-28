import { useReducer } from "react";
import {
  createInitialState,
  dealRound,
  revealNext,
  submitVote,
  proceedFromReveal,
  submitWolfGuess,
  skipVote,
  playAgain,
  newSetup,
} from "./gameEngine";
import SetupScreen from "./screens/SetupScreen";
import RevealScreen from "./screens/RevealScreen";
import DiscussScreen from "./screens/DiscussScreen";
import VoteScreen from "./screens/VoteScreen";
import RevealRolesScreen from "./screens/RevealRolesScreen";
import WolfGuessScreen from "./screens/WolfGuessScreen";
import ResultScreen from "./screens/ResultScreen";
import "./App.css";

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONFIG":
      return {
        ...state,
        config: { ...state.config, [action.key]: action.val },
      };
    case "START_GAME":
      return dealRound(state);
    case "REVEAL_NEXT":
      return revealNext(state);
    case "START_VOTE":
      return { ...state, phase: "VOTE" };
    case "SUBMIT_VOTE":
      return submitVote(state, action.votedOutId);
    case "SKIP_VOTE":
      return skipVote(state);
    case "PROCEED_FROM_REVEAL":
      return proceedFromReveal(state);
    case "SUBMIT_WOLF_GUESS":
      return submitWolfGuess(state, action.guess);
    case "PLAY_AGAIN":
      return playAgain(state);
    case "NEW_SETUP":
      return newSetup(state);
    default:
      return state;
  }
}

const SCREENS = {
  SETUP: SetupScreen,
  REVEAL: RevealScreen,
  DISCUSS: DiscussScreen,
  VOTE: VoteScreen,
  REVEAL_ROLES: RevealRolesScreen,
  WOLF_GUESS: WolfGuessScreen,
  RESULT: ResultScreen,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const Screen = SCREENS[state.phase];

  return (
    <div className="app">
      <Screen state={state} dispatch={dispatch} />
    </div>
  );
}
