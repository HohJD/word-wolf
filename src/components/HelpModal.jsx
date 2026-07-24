import { useEffect } from 'react';

const HELP = {
  app: {
    title: 'How to use JD Games',
    icon: '🎮',
    body: [
      'Add your players once from the home screen.',
      'Pick a game card — live games are ready to play.',
      'Pass the phone around and follow the on-screen prompts.',
      'Tap the ? button anytime to re-read the rules.',
    ],
  },
  wordwolf: {
    title: 'Word Wolf',
    icon: '🐺',
    body: [
      'Most players get the same word. One (or more) gets a slightly different word — they are the Wolf.',
      'Take turns describing your word without saying it.',
      'Villagers try to find the Wolf. The Wolf tries to blend in.',
      'Vote out the player you think is the Wolf.',
      'If a Wolf is caught, they get one last chance to guess the villagers\' word.',
    ],
  },
  truthordare: {
    title: 'Truth or Dare',
    icon: '🎲',
    body: [
      'Pick a player whose turn it is.',
      'Choose Truth or Dare and pick a difficulty.',
      'Read the card out loud and complete the challenge.',
      'Tap Next to pass to the next player.',
    ],
  },
  wouldyourather: {
    title: 'Would You Rather',
    icon: '🤔',
    body: [
      'Read the two choices out loud.',
      'Everyone votes for option A or B.',
      'See which choice the group prefers.',
      'Tap Next question to keep playing.',
    ],
  },
  mostlikelyto: {
    title: 'Most Likely To',
    icon: '👆',
    body: [
      'Reveal the prompt by tapping the card.',
      'Everyone votes for the player who fits the prompt.',
      'The chosen player earns a point.',
      'Check the leaderboard as you play.',
    ],
  },
  hottakes: {
    title: 'Hot Takes',
    icon: '🔥',
    body: [
      'Reveal a spicy opinion.',
      'Spin the wheel to pick who must defend it.',
      'Everyone votes whether the take is hot or cold.',
      'The defender scores a point if hot wins.',
    ],
  },
  alias: {
    title: 'Alias',
    icon: '🗣️',
    body: [
      'One player is the clue giver and holds the phone.',
      'Describe the word without using the taboo words.',
      'The team guesses. Tap Got it! when correct.',
      'Pass to the next clue giver after the round.',
    ],
  },
  avalon: {
    title: 'Avalon',
    icon: '🏰',
    body: [
      'Players are secretly Good or Evil. Evil players know each other (except Oberon, if playing).',
      'Merlin can see who is Evil (except Mordred). Percival sees Merlin and Morgana, but not which is which.',
      'Each round, the Leader picks a team. Everyone votes to approve or reject that team.',
      'If 5 teams get rejected in a row, Evil wins on the spot.',
      'The team then secretly plays Success or Fail. Good players must play Success.',
      'With 7+ players, quest 4 needs 2 Fails (not just 1) to fail.',
      'If Good wins 3 quests, the Assassin gets one guess at Merlin — right, and Evil wins anyway. 3 failed quests also wins it for Evil.',
    ],
  },
};

export default function HelpModal({ context, onClose }) {
  const content = HELP[context] || HELP.app;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card help-modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">{content.icon}</span>
            <h2 className="modal-title">{content.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <ol className="help-list">
          {content.body.map((item, i) => (
            <li key={i} className="help-list-item">
              <span className="help-bullet">{i + 1}</span>
              <span className="help-text">{item}</span>
            </li>
          ))}
        </ol>
        <button className="btn-primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
