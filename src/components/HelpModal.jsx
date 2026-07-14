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
    title: 'The Resistance: Avalon',
    icon: '🏰',
    body: [
      'Good and Evil are secretly assigned. Evil knows each other (except Oberon).',
      'Merlin knows Evil (except Mordred). Percival sees Merlin and Morgana.',
      'Each round the Leader proposes a quest team. Everyone votes to approve or reject it.',
      '5 rejected proposals in a row = Evil wins.',
      'On a quest, team members play Success/Fail. Good must play Success.',
      'Quest 4 with 7+ players needs 2 fails to fail.',
      '3 successful quests = Assassin guesses Merlin. 3 failed quests = Evil wins.',
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
