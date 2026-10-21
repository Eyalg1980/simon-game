import SimonBoard from '../components/SimonBoard.tsx';
import { TOTAL_ROUNDS } from '../game/constants.ts';
import './HomeScreen.css';

export default function HomeScreen() {
  return (
    <section className="home">
      <header className="screen-header">
        <h1>סיימון</h1>
      </header>

      <p className="home__round text-h3">
        שלב 1 מתוך {TOTAL_ROUNDS}
      </p>

      <SimonBoard />

      {/* Status and instructions area; filled by the game in later milestones */}
      <div className="home__status" aria-live="polite" />

      {/* Game logic is added in Milestone 2 */}
      <button type="button" className="btn-primary" onClick={() => {}}>
        התחל משחק
      </button>
    </section>
  );
}
