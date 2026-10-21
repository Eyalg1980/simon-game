import SimonBoard, { type BoardMode } from '../components/SimonBoard.tsx';
import GameResult from '../components/GameResult.tsx';
import { TOTAL_ROUNDS } from '../game/constants.ts';
import type { Game } from '../game/useGame.ts';
import './HomeScreen.css';

type Props = {
  game: Game;
};

export default function HomeScreen({ game }: Props) {
  const { state, displayRound, litColor, resultVisible, audioError } = game;
  const finished = state.status === 'won' || state.status === 'lost';

  let boardMode: BoardMode = 'locked';
  if (state.status === 'idle') boardMode = 'idle';
  else if (state.status === 'presenting') boardMode = 'presenting';
  else if (state.status === 'awaitingInput') boardMode = 'input';

  return (
    <section className="home">
      <header className="screen-header">
        <h1>סיימון</h1>
      </header>

      <p className="home__round text-h3">
        שלב {displayRound} מתוך {TOTAL_ROUNDS}
      </p>

      <SimonBoard
        mode={boardMode}
        litColor={litColor}
        onPadPointerDown={game.onPadPointerDown}
        onPadKeyDown={game.onPadKeyDown}
      />

      {/* Status and instructions area */}
      <div className="home__status" aria-live="polite">
        {state.status === 'idle' && audioError && (
          <p className="home__error text-caption">
            לא הצלחנו להפעיל את הצליל. ודא שהטלפון אינו במצב שקט ולחץ שוב.
          </p>
        )}
        {state.status === 'presenting' && <p className="text-h3">המשחק מציג את הרצף</p>}
        {state.status === 'awaitingInput' && (
          <>
            <p className="text-h3">התור שלך</p>
            <p className="home__hint text-caption">הקש על הצבעים לפי הסדר</p>
          </>
        )}
      </div>

      {state.status === 'idle' && (
        <button type="button" className="btn-primary" onClick={game.startGame}>
          התחל משחק
        </button>
      )}
      {finished && resultVisible && (
        <GameResult
          outcome={state.status === 'won' ? 'win' : 'loss'}
          completedRounds={state.completedRounds}
          onDismiss={game.dismiss}
        />
      )}
    </section>
  );
}
