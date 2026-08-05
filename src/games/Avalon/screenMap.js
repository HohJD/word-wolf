import { Lobby, Reveal, Board, Propose, Vote, QuestPlay, Assassin, End } from './screens';

// Phase → screen. Both the pass-and-play and online controllers render from this.
export const SCREENS = {
  lobby: Lobby,
  reveal: Reveal,
  board: Board,
  propose: Propose,
  vote: Vote,
  vote_reveal: Vote,
  vote_result: Vote,
  quest: QuestPlay,
  quest_reveal: QuestPlay,
  quest_result: QuestPlay,
  assassin: Assassin,
  end: End,
};
