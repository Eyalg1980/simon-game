# תוכנית – Milestone 2: משחק מלא מקצה לקצה

> מקורות: `PRD.md` (§3ב, §4.2, Edge Cases), `ARCHITECTURE.md` (§2.2–2.4, ADR-1, ADR-2, ADR-3, ADR-5), `DESIGN.md` (§1.1, §1.5, §2.1, §2.3, §2.4), `MILESTONES.md` (Milestone 2), `mockups.png`.
> מצב נוכחי (מהקוד): App Shell עם `screen` ב-`App`, `HomeScreen` סטטי (חיווי "שלב 1 מתוך 10", לוח, אזור סטטוס ריק, כפתור "התחל משחק" ללא פעולה), `SimonBoard` עם ארבעה `button` ללא אירועים, `colors.ts`, `constants.ts` (`TOTAL_ROUNDS`). אין Reducer, אודיו או קונפטי.

## 1. מטרה ותחום

סבב משחק שלם: "התחל משחק" → הצגת רצף (הארה + צליל) → תור השחקן → שלב הבא / הפסד / ניצחון → הודעת סיום עם צליל (וקונפטי בניצחון) → "אישור" → חזרה למצב "לפני תחילת משחק".

**בתחום:**
- Reducer טהור עם המצבים `idle`, `presenting`, `awaitingInput`, `won`, `lost`.
- Sequence Controller עם ביטול מלא (`AbortController` + `presentationId`), לפי טבלת הקצב ב-`DESIGN.md` §1.1.
- Audio Engine על Web Audio API: ארבעה צלילי צבע, צליל ניצחון, צליל הפסד, פתיחת `AudioContext` מתוך לחיצה, הודעת שגיאה בכשל.
- קלט מגע ב-`pointerdown`, מגע יחיד בכל פעם, תמיכה במקלדת.
- הודעות סיום (Overlay מעל הלוח), כפתור "אישור", קונפטי בניצחון בלבד.
- פתרון זמני: מעבר ל"אודות" באמצע משחק פעיל מבטל אותו (`abandon`).

**מחוץ לתחום:** מצב `paused`, "המשך משחק", `visibilitychange`/`pagehide` (M3); שמירת היסטוריה ב-`localStorage` והודעת כשל שמירה (M4); PWA (M5). לא נוגעים ב-`localStorage` בכלל.

## 2. תלויות (npm)

- **Dependencies:** `canvas-confetti`.
- **Dev Dependencies:** `@types/canvas-confetti`.
- אין תלויות נוספות. אין צורך ב-`.env`.

## 3. קבצים

```text
src/
├── audio/
│   └── audioEngine.ts          (חדש – Web Audio: unlock, צלילי צבע, ניצחון/הפסד, עצירה)
├── game/
│   ├── colors.ts               (קיים – ללא שינוי)
│   ├── constants.ts            (שינוי – הוספת קבועי קצב TIMING)
│   ├── random.ts               (חדש – randomColor())
│   ├── gameReducer.ts          (חדש – State, Actions, Reducer טהור)
│   └── useGame.ts              (חדש – Hook: Reducer + Controller + קלט + אודיו)
├── components/
│   ├── SimonBoard.tsx/.css     (שינוי – מצבי הארה/עמעום, pointer events, disabled)
│   └── GameResult.tsx/.css     (חדש – Overlay ניצחון/הפסד + קונפטי)
├── screens/
│   ├── HomeScreen.tsx/.css     (שינוי – מקבל את מצב המשחק ומציג לפי מצב)
│   └── AboutScreen.tsx         (ללא שינוי)
├── App.tsx                     (שינוי – useGame ב-App, abandon בניווט ל"אודות")
└── test/
    ├── gameReducer.test.ts     (חדש)
    ├── audioEngine.test.ts     (חדש – ארבעה תדרים שונים)
    ├── game.test.tsx           (חדש – אינטגרציה עם Fake Timers)
    └── App.test.tsx            (קיים – לוודא שעדיין עובר)
```

**קבצים נוספים שמשתנים:** `spec/MILESTONES.md` (🟡 בסיום), `spec/ARCHITECTURE.md` (ADR-10, ADR-11 – ראה §9), `package.json` / `package-lock.json`.

## 4. פירוט לפי קובץ

### 4.1 `src/game/constants.ts`
להוסיף, לצד `TOTAL_ROUNDS`, אובייקט קבועים לפי טבלת הקצב (ערכים מחייבים, זהים בכל השלבים):

| קבוע | ערך | משמעות |
|---|---|---|
| `TONE_MS` | 600 | הארה וצליל של צבע ברצף |
| `GAP_MS` | 250 | הפסקה בין צבעים |
| `START_DELAY_MS` | 1000 | אחרי "התחל משחק" עד הצבע הראשון |
| `ROUND_DONE_HOLD_MS` | 1000 | חיווי השלב שהושלם נשאר, ואז מוצג מספר השלב הבא |
| `NEXT_ROUND_DELAY_MS` | 1000 | אחרי הצגת מספר השלב הבא עד הצבע הראשון |
| `RESULT_DELAY_MS` | 1000 | אחרי הלחיצה המכריעה עד הודעת הסיום + צליל סיום (+ קונפטי) |
| `PRESS_MIN_MS` | 300 | הארה וצליל מינימליים בלחיצת שחקן |

### 4.2 `src/game/random.ts`
`randomColor(): ColorId` – `COLORS[Math.floor(Math.random() * 4)].id`. מודול נפרד כדי שבדיקות יוכלו להחליפו (ADR-2). צבע חוזר מותר.

### 4.3 `src/game/gameReducer.ts` (טהור, ללא אודיו/Timers/אחסון)

**State:**
```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';
type GameState = {
  status: GameStatus;
  sequence: ColorId[];        // 0–10
  round: number;              // 1–10 (ב-idle: 1)
  inputIndex: number;
  completedRounds: number;    // 0–10
  gameId: number;             // עולה בכל start
  presentationId: number;     // עולה בכל כניסה ל-presenting ובכל ביטול
  intro: 'start' | 'nextRound'; // איזו המתנה קודמת לצבע הראשון
};
```

**Actions (כל Action שאינו חוקי במצב הנוכחי מחזיר את אותו State):**
- `start { firstColor }` – רק מ-`idle`: `sequence=[firstColor]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `presentationId+1`, `intro='start'`, `status='presenting'`.
- `presentationDone { presentationId }` – רק מ-`presenting` ורק אם ה-id תואם (אחרת מתעלם – הגנה מ-Callback מיושן) → `awaitingInput`, `inputIndex=0`.
- `press { color, nextColor }` – רק מ-`awaitingInput`:
  - צבע שגוי → `lost` מיד (`completedRounds` נשאר `round-1`).
  - נכון ולא אחרון ברצף → `inputIndex+1`.
  - נכון ואחרון: `completedRounds=round`; אם `round===10` → `won`; אחרת `round+1`, `sequence=[...sequence, nextColor]`, `inputIndex=0`, `presentationId+1`, `intro='nextRound'`, `status='presenting'` (ARCHITECTURE §2.3 כלל 10 – המעבר שייך לשלב הבא).
- `dismiss` – רק מ-`won`/`lost` → `initialGameState` תוך שמירת `gameId` ו-`presentationId` (ADR-5).
- `abandon` – **זמני ל-M2**, רק מ-`presenting`/`awaitingInput` → כמו `dismiss` + `presentationId+1`. יוסר ב-M3 (ADR-3).

ה-`nextColor` מוגרל בכל `press` מחוץ ל-Reducer ומשמש רק כשהשלב הושלם; כך ה-Reducer דטרמיניסטי (ADR-2). אין שלב 11: `won` הוא מצב סופי שאינו מקבל `press`.

### 4.4 `src/audio/audioEngine.ts`
מודול יחיד (Singleton מודולרי, ללא React), שמחזיק `AudioContext` אחד:

- `unlockAudio(): Promise<boolean>` – נקרא **בתוך** ה-`onClick` של "התחל משחק": יוצר `AudioContext` אם אין (בתמיכה גם ב-`webkitAudioContext`), קורא `resume()` באופן סינכרוני מתוך ה-Gesture, ומחכה לו עם Timeout של `1500ms`. מחזיר `true` רק אם `state === 'running'`. אין תמיכה / חריגה / Timeout → `false`. במקביל מנגן Buffer שקט קצר (מסייע לפתיחת אודיו ב-iOS).
- `TONE_FREQUENCIES` – ארבעה תדרים שונים בסגנון Simon הקלאסי: ירוק `415Hz`, אדום `310Hz`, צהוב `252Hz`, כחול `209Hz` (גל `triangle`/`sine`).
- `startTone(color): () => void` – OscillatorNode + GainNode עם Envelope קצר (Attack/Release ~`15ms`) למניעת קליקים; מחזיר פונקציית עצירה. משמש גם להצגה (600ms) וגם ללחיצה (כל עוד האצבע לוחצת).
- `playWin()` – מוטיב עולה קצר (ארבעה צלילים, ~`800ms`).
- `playLoss()` – מוטיב יורד ונמוך (גל `sawtooth`/`square` רך, ~`700ms`).
- `stopAll()` – עוצר מיד כל Oscillator פעיל (מעקב ב-`Set`).
- אם `AudioContext` לא קיים או לא `running`, הפונקציות לא זורקות שגיאה (No-op), כדי שלא יקרסו.

### 4.5 `src/game/useGame.ts` – Hook מרכזי (מוחזק ב-`App`, כדי שמעבר מסכים לא יפרק אותו)

מחזיר: `state`, `displayRound`, `litColor` (הצבע המואר כרגע – בהצגה או בלחיצה), `resultVisible`, `audioError`, `startGame()`, `dismiss()`, `abandon()`, ו-Handlers ללוח (`onPadPointerDown`, `onPadKeyDown`).

**Sequence Controller (Effect לפי `[state.status, state.presentationId]`):**
- רק כש-`status==='presenting'`: יוצר `AbortController`, ובונה ציר זמן אחד של `setTimeout`:
  - `intro==='start'`: המתנה `1000ms`.
  - `intro==='nextRound'`: `displayRound = round-1` למשך `1000ms`, אחר כך `displayRound = round`, ועוד `1000ms`.
  - לכל צבע: `litColor=c` + `startTone(c)` → אחרי `600ms` כיבוי ועצירת צליל → `250ms` הפסקה → הבא.
  - בסיום: `dispatch(presentationDone(presentationId))`.
- Cleanup: `abort()` → `clearTimeout` לכל ה-Timers, עצירת הצליל הפעיל, `litColor=null`. כל Callback בודק `signal.aborted` לפני פעולה.
- `displayRound` שווה `state.round` בכל מצב אחר (בסיום נשאר על השלב האחרון שהיה פעיל; ב-`idle` = 1).

**קלט שחקן (ADR-2):**
- `onPadPointerDown(color, e)`: מתעלם אם `status !== 'awaitingInput'` או אם כבר יש `activePointerId` (מגע שני בו-זמני). אחרת: שומר `pointerId` וזמן, `litColor=color`, `startTone(color)`, ו-`dispatch(press(color, randomColor()))`.
- שחרור נקלט ב-`window` (`pointerup`/`pointercancel` עם אותו `pointerId`): עצירת ההארה והצליל אחרי `max(0, 300 - משך הלחיצה)`; רק אז `activePointerId=null`.
- `onPadKeyDown` (Enter/Space, ללא Repeat): לחיצה בת `300ms`.
- הלחיצה המכריעה (שגויה או אחרונה בשלב 10) משמיעה מיד את צליל הצבע שנלחץ, כמו כל לחיצה.

**סיום משחק:**
- Effect בכניסה ל-`won`/`lost` (לפי `gameId`): `setTimeout(1000)` → `resultVisible=true` + `playWin()` / `playLoss()`. Cleanup מבטל את ה-Timer. `resultVisible=false` ב-`dismiss` וב-`start`.

**התחלה:**
- `startGame()` (נקרא מה-`onClick`): Guard נגד לחיצה כפולה; `const ok = await unlockAudio()`; אם `ok` – מנקה `audioError` ו-`dispatch(start(randomColor()))`; אחרת `audioError=true` והמשחק נשאר ב-`idle` (אין התקדמות שקטה).

**ביטול (ניווט ל"אודות"):** `abandon()` → `dispatch(abandon)`; שינוי ה-`presentationId` מפעיל את ה-Cleanup של ה-Controller. בנוסף `stopAll()`, ניקוי `litColor` ו-`activePointerId` מיד.

**Unmount:** Cleanup כללי של כל ה-Timers ו-`stopAll()`.

### 4.6 `SimonBoard`
- Props: `litColor`, `mode: 'idle' | 'presenting' | 'input' | 'locked'`, `onPadPointerDown`, `onPadKeyDown`.
- הרבעים `disabled` בכל מצב חוץ מ-`input` (חוסם קלט בזמן הצגה ובזמן המתנת סיום). `aria-label` בעברית נשאר.
- מחלקות CSS:
  - `.simon-board--presenting` – כל הרבעים מעומעמים (`filter: brightness(.45) saturate(.7)`), כמו ב-Mockup "הצגת רצף".
  - `.simon-board__pad--lit` – בהירות מלאה+ (`brightness(1.25)`) ו-Glow: `box-shadow: 0 0 28px 6px <צבע הרבע>`, `z-index` מעל השכנים.
  - ב-`input` וב-`idle` הלוח בצבעים מלאים (Mockups "התחלה" / "התור שלך").
  - `transition` קצר (~`80ms`) להארה; `prefers-reduced-motion` כבר מבטל transitions – ההארה עדיין משתנה מיידית.
- `onContextMenu` → `preventDefault` (מניעת תפריט לחיצה ארוכה במובייל). `touch-action: manipulation` ו-`user-select: none` כבר קיימים.

### 4.7 `GameResult` (Overlay)
- ממוקם `position: absolute` מעל אזור הלוח (עוטף חדש `.home__board-area` עם `position: relative`), כרטיס `Surface` עם גבול כחול ופינות מעוגלות; הלוח נשאר מזוהה ברקע (Scrim חלקי).
- ניצחון: **"כל הכבוד! ניצחת!"** (H1; "כל הכבוד!" בירוק, "ניצחת!" בלבן כמו ב-Mockup). הפסד: **"נפסלת!"** באדום + **"שלבים שהושלמו: X"** (Body).
- `role="dialog"` עם `aria-labelledby`; פוקוס עובר לכפתור "אישור".
- קונפטי: רק כש-`outcome==='win'` – ב-Effect בעת הופעת ההודעה: `confetti({ particleCount, spread, origin, colors: [ארבעת צבעי המשחק], disableForReducedMotion: true })`; Cleanup → `confetti.reset()`.
- כפתור **"אישור"** – `btn-primary` באזור כפתור הפעולה שמתחת ללוח (כמו מיקום "שחק שוב" ב-Mockup, עם הנוסח המחייב "אישור"). לחיצה → `dismiss()`.

### 4.8 `HomeScreen`
מקבל מ-`App` את ערכי `useGame` ומציג לפי מצב:

| מצב | חיווי שלב | אזור סטטוס (מתחת ללוח) | כפתור |
|---|---|---|---|
| `idle` | "שלב 1 מתוך 10" | ריק, או הודעת שגיאת הצליל (Caption אדום, DESIGN §1.5) | "התחל משחק" |
| `presenting` | `displayRound` | **"המשחק מציג את הרצף"** | אין |
| `awaitingInput` | `round` | **"התור שלך"** + **"הקש על הצבעים לפי הסדר"** (Caption) | אין |
| `won`/`lost` לפני `resultVisible` | `round` | ריק | אין |
| `won`/`lost` אחרי `resultVisible` | `round` | Overlay מעל הלוח | "אישור" |

- טקסט השגיאה: **"לא הצלחנו להפעיל את הצליל. ודא שהטלפון אינו במצב שקט ולחץ שוב."** – נעלם בהתחלה מוצלחת.
- אזור הסטטוס בעל `min-height` קבוע כדי שהפריסה לא תקפוץ; `aria-live="polite"` נשאר.

### 4.9 `App.tsx`
- `const game = useGame();` ברמת `App`.
- `navigate('about')` → קודם `game.abandon()` (פתרון זמני), ואז מעבר מסך. `abandon` לא משפיע על `idle`/`won`/`lost`.
- מעבירים ל-`HomeScreen` את מה שצריך. `AboutScreen` ללא שינוי.

## 5. בדיקות אוטומטיות

**Mocks משותפים:** `vi.mock` ל-`audioEngine` (פונקציות `vi.fn`, `unlockAudio` מחזיר `true` כברירת מחדל), ל-`random.ts` (רצף צבעים מוכתב מראש), ול-`canvas-confetti` (jsdom ללא Canvas). Fake Timers ו-`fireEvent` סינכרוני (ADR-2). `fireEvent.pointerDown/pointerUp` עם `pointerId`.

### 5.1 `gameReducer.test.ts`
- `start` יוצר רצף באורך 1, `round=1`, `presenting`.
- אורכי רצף: שלב 1 → 1, שלב 2 → 2, שלב 10 → 10; הרצף הקודם נשמר במלואו כתחילת הבא (prefix).
- צבע חוזר מותר (`nextColor` זהה לאחרון).
- `press` ב-`presenting`/`idle`/`won`/`lost` לא משנה State.
- `presentationDone` עם id ישן מתעלם.
- הפסד בשלב 1 → `completedRounds=0`; הפסד בשלב 5 → `4`.
- ניצחון אחרי שלב 10 → `won`, `completedRounds=10`, `sequence.length===10`; `press` נוסף לא יוצר שלב 11.
- `dismiss` → `idle` עם אותו `gameId`; `start` הבא → `gameId` חדש ורצף חדש.
- `abandon` מ-`presenting`/`awaitingInput` → `idle`; לא משפיע ב-`won`/`lost`.

### 5.2 `audioEngine.test.ts`
- ארבעת התדרים ב-`TONE_FREQUENCIES` שונים זה מזה.
- `unlockAudio` מחזיר `false` כשאין `AudioContext` (jsdom), בלי לזרוק.

### 5.3 `game.test.tsx` (אינטגרציה דרך `App`)
- "התחל משחק" → "המשחק מציג את הרצף", הרבעים `disabled`; אחרי `1000ms` הרבע הראשון מואר ו-`startTone` נקרא איתו; אחרי `600ms` כבה; אחרי `250ms` הבא.
- קצב קבוע: המרווחים בין קריאות `startTone` בשלב 1 ובשלב 3 זהים (`850ms`), ומשך כל צליל `600ms`.
- מעבר שלב: אחרי שחזור נכון החיווי נשאר "שלב 1 מתוך 10" `1000ms`, אז "שלב 2 מתוך 10", ואחרי עוד `1000ms` הצבע הראשון.
- לחיצה בזמן הצגה אינה משפיעה (גם אם `disabled` הוסר ידנית – נבדק דרך ה-Handler).
- מגע שני בו-זמנית (`pointerId` אחר) לפני שחרור הראשון – לא נקלט.
- הפסד בשלב 1: הצליל של הרבע נקרא מיד; אחרי `999ms` אין הודעה; ב-`1000ms` "נפסלת!" + "שלבים שהושלמו: 0" + `playLoss` פעם אחת; `confetti` לא נקרא.
- הפסד בשלב מתקדם (למשל 4) → "שלבים שהושלמו: 3".
- ניצחון: משחק מלא של 10 שלבים → "כל הכבוד! ניצחת!", `playWin`, `confetti` נקרא; "שלב 10 מתוך 10" נשאר.
- "אישור" → "התחל משחק" ו-"שלב 1 מתוך 10"; "התחל משחק" שוב → `randomColor` נקרא מחדש ורצף חדש מוצג.
- כשל אודיו: `unlockAudio` מחזיר `false` → הודעת השגיאה מוצגת, נשארים ב-`idle`, `startTone` לא נקרא; לחיצה מוצלחת אחר כך מסירה את ההודעה.
- ניווט ל"אודות" באמצע הצגה ובאמצע תור השחקן → `stopAll` נקרא, `vi.getTimerCount() === 0`, ובחזרה ל"בית" מופיע "התחל משחק" ו"שלב 1 מתוך 10".
- רענון: `unmount` ו-`render` מחדש → מצב התחלה; `localStorage` לא נקרא ולא נכתב (Spy).

## 6. סדר העבודה בשלב הבנייה

1. התקנת `canvas-confetti` ו-`@types/canvas-confetti`.
2. `constants.ts`, `random.ts`, `gameReducer.ts` + `gameReducer.test.ts` (להריץ ולעבור).
3. `audioEngine.ts` + בדיקה.
4. `useGame.ts`, עדכוני `SimonBoard`, `GameResult`, `HomeScreen`, `App`.
5. `game.test.tsx`; הרצת `npm run typecheck`, `npm run test`, `npm run build`.
6. בדיקה ידנית ב-Browser pane (`npm run dev` דרך `preview_start`) באמולציית מובייל: התחלה, הצגה, תור, מעבר שלב, הפסד, ניצחון (בעזרת משחק מלא), "אישור", מעבר לאודות באמצע משחק, ללא גלילה אופקית. צלילים אמיתיים ומגע – רק במכשיר; יסומנו כ"לא נבדק ידנית במכשיר" עד שהמשתמש יבדוק.
7. הוספת ADR-10 ו-ADR-11 ל-`ARCHITECTURE.md`, סימון 🟡 ב-`MILESTONES.md`, סגירת השרת.

## 7. מיפוי ל-Definition of Done

| תנאי DoD | איך נבדק |
|---|---|
| התחלה בלחיצה; אורכי רצף 1/2/10; prefix נשמר | 5.1 + 5.3 (התחלה) |
| ארבעה צלילים שונים והארה נבדלת; קצב קבוע | 5.2 (תדרים), 5.3 (קצב), CSS `--lit` ובדיקה ויזואלית |
| לחיצות ב-`presenting` לא משפיעות; נכונה מקדמת; שגויה מפסידה; מגע כפול – רק הראשון | 5.1 + 5.3 |
| בדיקות: הפסד בשלב 1, הפסד מתקדם, ניצחון, אין שלב 11, רצף חדש במשחק הבא | 5.1 + 5.3 |
| טקסט וצליל סיום; קונפטי רק בניצחון | 5.3 |
| רענון מבטל משחק; אין אחסון מתמיד | 5.3 (רענון + Spy על `localStorage`) |
| קצב לפי DESIGN; צליל הרבע מיד ואחרי שנייה צליל הפסד + הודעה | 5.3 |
| מעבר ל"אודות" לא משאיר הארה/צליל/Timer | 5.3 (`stopAll`, `getTimerCount`) |

## 8. בדיקה במכשיר (על ידי המשתמש)

השמעת הצלילים בפועל, מצב שקט בטלפון, ותחושת המגע אפשר לאמת רק בטלפון. אחרי האישור והדחיפה, האתר יתעדכן בכתובת `https://eyalg1980.github.io/simon-game/`; לפני כן אפשר לבדוק מקומית במחשב.

## 9. החלטות ונקודות לתשומת לב

- **ADR-10 (יתועד בבנייה): ציר הצגה אחד לכל `presentationId`, עם `intro` ב-State.** ה-Reducer מעביר מיד לשלב הבא (כלל 10), וה-Controller מציג את מספר השלב הקודם `1000ms` לפני שמחליף ל-`displayRound` החדש. כך ההמתנות שבין שלבים שייכות להצגה של השלב הבא, ו-M3 יוכל להשהות/לבטל אותן באותו מנגנון.
- **ADR-11 (יתועד בבנייה): בדיקת פתיחת אודיו.** `resume()` נקרא סינכרונית בתוך הלחיצה, ונחשב הצלחה רק אם `state==='running'` תוך `1500ms`. מגבלה ידועה: מתג "שקט" באייפון משתיק Web Audio בלי שגיאה שניתן לזהות – לכן הנוסח בהודעה ובמסך אודות מזכיר את המצב השקט.
- **מיקום טקסט הסטטוס:** ב-Mockups חיווי "המשחק מציג את הרצף"/"התור שלך" מופיע מעל הלוח, אבל טקסט `DESIGN.md` §1.1 קובע "מתחת ללוח מופיע אזור משתנה לטקסט סטטוס" – הטקסט מחייב, ולכן הסטטוס מתחת ללוח.
- **כפתור "אישור" מתחת ללוח** (במקום כפתור הפעולה, כמו ב-Mockup), בנוסח המחייב "אישור" ולא "שחק שוב".
- **השהיה אחרי הכרעה (לפני הודעת הסיום):** ב-M2 ה-Timer של ההודעה רץ ברמת `App`, כך שמעבר לאודות לא מבטל אותה. ההתנהגות המלאה ("בחזרה מוצגת ההודעה מיד") שייכת ל-DoD של M3.
- **`abandon` הוא זמני** ומוסר ב-M3 (ADR-3); אין לבנות סביבו לוגיקה נוספת.
