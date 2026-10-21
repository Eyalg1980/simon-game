import './GameResult.css';

type Props = {
  outcome: 'win' | 'loss';
  completedRounds: number;
  onDismiss: () => void;
};

// Result dialog above a blurred backdrop; the board stays recognizable behind it (DESIGN §1.1)
export default function GameResult({ outcome, completedRounds, onDismiss }: Props) {
  return (
    <div className="game-result">
      <div
        className="game-result__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-result-title"
      >
        {outcome === 'win' ? (
          <h2 id="game-result-title" className="game-result__title">
            <span className="game-result__accent">כל הכבוד!</span> <span>ניצחת!</span>
          </h2>
        ) : (
          <>
            <h2 id="game-result-title" className="game-result__title game-result__title--loss">
              נפסלת!
            </h2>
            <p className="game-result__detail">שלבים שהושלמו: {completedRounds}</p>
          </>
        )}
        <button type="button" className="btn-primary" onClick={onDismiss} autoFocus>
          אישור
        </button>
      </div>
    </div>
  );
}
