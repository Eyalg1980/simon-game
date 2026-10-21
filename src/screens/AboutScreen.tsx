import { TOTAL_ROUNDS } from '../game/constants.ts';
import './AboutScreen.css';

export default function AboutScreen() {
  return (
    <section className="about">
      <header className="screen-header">
        <h1>אודות</h1>
      </header>

      <article className="card about__intro">
        <h2>על המשחק</h2>
        <p>סיימון הוא משחק זיכרון: המשחק מציג רצף של צבעים וצלילים, ואתה צריך לחזור עליו.</p>
        <ul className="about__instructions">
          <li>לחץ על "התחל משחק".</li>
          <li>צפה ברצף הצבעים והקשב לצלילים.</li>
          <li>לחץ על הצבעים באותו הסדר.</li>
          <li>בכל שלב נוסף צבע אחד לרצף. טעות אחת מסיימת את המשחק.</li>
          <li>השלם את כל {TOTAL_ROUNDS} השלבים כדי לנצח.</li>
          <li>ודא שהטלפון אינו במצב שקט, כדי לשמוע את הצלילים.</li>
        </ul>
      </article>

      <section className="about__history" aria-labelledby="history-title">
        <h2 id="history-title">10 המשחקים האחרונים</h2>
        {/* History list and delete button are added in Milestone 4 */}
        <p className="about__empty">עדיין אין משחקים שמורים.</p>
      </section>
    </section>
  );
}
