# תוכנית – Milestone 1: בסיס אפליקציה, שני מסכים מעוצבים ופרסום ב-GitHub Pages

> מקורות: `PRD.md`, `ARCHITECTURE.md` (§1, §2.1, §2.4, §2.9, ADR-1, ADR-8), `DESIGN.md` (§1.1–1.4, §2), `MILESTONES.md` (Milestone 1), והתמונות `wireframes.png`, `mockups.png`, `style-guide.png`.
> מצב נוכחי: אין עדיין קוד בפרויקט. ה-Repository המקומי כבר מחובר ל-`https://github.com/Eyalg1980/simon-game.git`. מותקנים מקומית Node `24.x` ו-npm `11.x`.

## 1. מטרה ותחום

להקים פרויקט React + TypeScript + Vite עובד, עם שני מסכים (**בית**, **אודות**) מעוצבים לפי ה-Mockups, ניווט פנימי ביניהם ללא רענון, בדיקות בסיסיות, ו-Workflow שמפרסם את האתר ל-GitHub Pages בכל Push ל-`main`.

**בתחום:**
- שלד הפרויקט, סקריפטים (`dev`, `build`, `preview`, `test`, `typecheck`), הגדרות TypeScript ו-Vitest.
- App Shell עם מעבר בין שני מסכים בתוך אותו React Tree (State ב-`App`, ללא Router).
- מסך בית במצב "לפני תחילת משחק" בלבד: כותרת, חיווי **"שלב 1 מתוך 10"**, לוח עגול עם ארבעה רבעים, אזור סטטוס ריק, כפתור **"התחל משחק"**.
- מסך אודות: כותרת, כרטיס **"על המשחק"**, כותרת היסטוריה וחיווי ריק.
- Theme כהה, צבעים, Heebo ארוז, פס ניווט.
- Workflow ל-GitHub Pages.

**מחוץ לתחום (אבני דרך מאוחרות):** לוגיקת משחק, Reducer, אודיו, קונפטי (M2); השהיה (M3); `localStorage`, כרטיסי היסטוריה, כפתור "מחק היסטוריה" ו-Dialog (M4); PWA, Manifest, Service Worker ואייקונים (M5). לא מתקינים עדיין `canvas-confetti` או `vite-plugin-pwa`.

## 2. תלויות (npm)

**Dependencies:** `react`, `react-dom`, `@fontsource/heebo`.

**Dev Dependencies:** `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.

- גרסאות: היציבות העדכניות בזמן ההתקנה, עם `package-lock.json` שנכנס ל-Repository.
- לא משתמשים ב-`npm create vite` (התבנית מוסיפה ESLint וקובצי דמו); הקבצים נכתבים ידנית לפי הרשימה למטה.
- אין צורך ב-`.env` – לאפליקציה אין מפתחות או הגדרות סודיות.

## 3. קבצים ליצירה

```text
simon-game/
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── package-lock.json            (נוצר ב-npm install)
├── tsconfig.json                (references בלבד)
├── tsconfig.app.json            (src)
├── tsconfig.node.json           (vite.config.ts)
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css                  (App Shell: פריסה אנכית, אזור תוכן, מיקום הניווט)
    ├── index.css                (CSS Variables, reset, טיפוגרפיה, כפתור ראשי, כרטיס)
    ├── vite-env.d.ts
    ├── game/
    │   ├── colors.ts            (הגדרת ארבעת הצבעים ומיקומם בלוח)
    │   └── constants.ts         (TOTAL_ROUNDS = 10)
    ├── components/
    │   ├── SimonBoard.tsx + SimonBoard.css
    │   └── BottomNav.tsx + BottomNav.css
    ├── screens/
    │   ├── HomeScreen.tsx + HomeScreen.css
    │   └── AboutScreen.tsx + AboutScreen.css
    └── test/
        ├── setup.ts             (jest-dom matchers)
        ├── App.test.tsx         (Render + Navigation)
        └── colors.test.ts       (מיקומי הרבעים)
```

**קבצים קיימים שמשתנים:**
- `CLAUDE.md` – מילוי סעיף **פקודות הרצה**: `npm run dev` (כתובת `http://localhost:5173/simon-game/`) ו-`npm run test`.
- `spec/MILESTONES.md` – סימון 🟡 ליד Milestone 1 בסיום הבנייה.
- `.gitignore` – אין צורך בשינוי (`dist/`, `node_modules/`, `*.tsbuildinfo` כבר קיימים).

## 4. פירוט לפי קובץ

### 4.1 `package.json`
- `"name": "simon-game"`, `"private": true`, `"type": "module"`.
- סקריפטים:
  - `"dev": "vite"`
  - `"build": "vite build"`
  - `"preview": "vite preview"`
  - `"typecheck": "tsc -b"`
  - `"test": "vitest run"`
- ה-Typecheck מופרד מה-Build, כי ה-Workflow מריץ אותו כשלב נפרד (§2.9).

### 4.2 TypeScript
- `tsconfig.app.json`: `strict: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `noEmit: true`, `types: ["vitest/globals", "@testing-library/jest-dom"]`, `include: ["src"]`.
- `tsconfig.node.json`: עבור `vite.config.ts`, `noEmit: true`.
- `tsconfig.json`: `files: []` ו-`references` לשניהם.

### 4.3 `vite.config.ts`
- `base: '/simon-game/'` בכל הסביבות (ADR-8), מוגדר כקבוע `BASE_PATH` כדי ש-M5 יגזור ממנו את `start_url`/`scope`/`id`.
- Plugin: `react()`.
- `test`: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test/setup.ts'`, `css: false`.

### 4.4 `index.html`
- `<html lang="he" dir="rtl">`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- `<meta name="theme-color" content="#0A1628">`.
- `<title>סיימון</title>`.
- `<link rel="icon" href="data:,">` – מונע בקשת `favicon.ico` משורש הדומיין (שגיאת 404) עד שאייקון אמיתי יתווסף ב-M5.
- `<div id="root">` ו-`<script type="module" src="/src/main.tsx">` (Vite מתרגם לנתיב עם ה-`base`).

### 4.5 `src/main.tsx`
- ייבוא משקלי Heebo שבשימוש בלבד: `@fontsource/heebo/400.css`, `600.css`, `700.css` (§2.7 בארכיטקטורה).
- ייבוא `index.css`, רינדור `<App />` בתוך `<StrictMode>`.

### 4.6 `src/game/colors.ts` ו-`constants.ts`
- `type ColorId = 'green' | 'red' | 'yellow' | 'blue'`.
- מערך `COLORS` עם: `id`, `label` בעברית (`'ירוק'`, `'אדום'`, `'צהוב'`, `'כחול'`), ו-`gridArea`.
- סידור מחייב (DESIGN §1.1, גובר על ה-Wireframes): **ירוק – למעלה משמאל, אדום – למעלה מימין, צהוב – למטה משמאל, כחול – למטה מימין**.
- `TOTAL_ROUNDS = 10` ב-`constants.ts`; חיווי השלב משתמש בו.

### 4.7 `src/App.tsx` – App Shell
- `const [screen, setScreen] = useState<'home' | 'about'>('home')`.
- מבנה: `<div className="app">` → `<main className="app__content">` (מציג `HomeScreen` או `AboutScreen`) → `<BottomNav current={screen} onNavigate={setScreen} />`.
- בעת מעבר מסך: גלילה לראש אזור התוכן (`window.scrollTo(0, 0)`), כדי שמסך אודות ארוך לא ייפתח באמצע.
- אין שימוש ב-`<a href>` לניווט – רק `button`, כך שאין טעינת דף.
- (ב-M2 יתווסף כאן `useGame`, כדי שמעבר מסכים לא יפרק את מצב המשחק – ADR-2.)

### 4.8 `BottomNav`
- `<nav aria-label="ניווט ראשי">` עם שני `<button type="button">`: **"בית"** (ראשון, כלומר מימין ב-RTL) ו-**"אודות"**.
- הכפתור הפעיל: `aria-current="page"`, טקסט לבן מודגש (`700`); הלא-פעיל: `Soft Gray` מעומעם (שקיפות ~0.6), משקל `600`.
- עיצוב לפי ה-Mockups: משטח `Surface`, גבול `Border`, פינות מעוגלות (`16px`), קו הפרדה אנכי בין שתי האפשרויות, גובה מגע ≥ `48px`, ללא אייקונים.
- ממוקם בתחתית ה-Viewport (`position: sticky; bottom`), עם ריווח `env(safe-area-inset-bottom)` לטלפונים עם פס בית.

### 4.9 `HomeScreen`
מבנה אנכי (DESIGN §1.1, §2.4):
1. `<h1>` **"סיימון"** – `32px Bold`, ממורכז, וקו הפרדה דק בצבע `Border` מתחתיו (כמו ב-Mockups).
2. חיווי שלב: `<p>` **"שלב 1 מתוך 10"** – `20px Semibold`, לבן, ממורכז. טקסט רגיל, לא Badge ולא Progress Bar.
3. `<SimonBoard />`.
4. אזור סטטוס (`aria-live="polite"`) – ריק במצב זה, עם גובה מינימלי שמור כדי שהפריסה לא תקפוץ כשיתווספו בו טקסטים ב-M2.
5. כפתור ראשי **"התחל משחק"** – ב-M1 ללא פעולה (`onClick` ריק). לא מסומן `disabled`, כי זה המראה הסופי של מצב "לפני תחילת משחק".

### 4.10 `SimonBoard` (ADR-1)
- מיכל עגול (`border-radius: 50%`), רקע `Charcoal` (משמש גם כפסי ההפרדה דרך `gap`), מסגרת חיצונית כהה ועבה וצל רך.
- `display: grid; grid-template: "green red" 1fr "yellow blue" 1fr / 1fr 1fr; direction: ltr;` – הסידור המרחבי אינו מתהפך ב-RTL (DESIGN §2.5).
- ארבעה `<button type="button" aria-label="ירוק">` וכו', כל אחד ב-`grid-area` מתוך `colors.ts`, עם עיגול של הפינה החיצונית בלבד (רבע עיגול), בצבע המלא שלו (מצב "לוח מלא").
- דיסק מרכזי: `<div aria-hidden="true">` ממורכז ב-`position: absolute`, קוטר ~32% מהלוח, `Charcoal` עם מסגרת `Border`, **ללא טקסט**, `pointer-events: none`.
- גודל: `width: min(86vw, 360px, calc(100dvh - 320px))` עם `aspect-ratio: 1` ומינימום סביר, כך שבמצב רוחב הלוח מוקטן ונכנס בגובה המסך (DESIGN §2.4). הערך הסופי יכויל בבדיקה ויזואלית.
- מניעת בעיות מגע: `touch-action: manipulation`, `user-select: none`, `-webkit-tap-highlight-color: transparent`.
- ב-M1 לרבעים אין Handlers. מצבי Glow/עמעום יתווספו ב-M2 כ-Classes ב-CSS.

### 4.11 `AboutScreen`
מבנה (DESIGN §1.2):
1. `<h1>` **"אודות"** (לפי ה-Wireframes – ראה טבלת ההתאמה ב-DESIGN §2.6).
2. כרטיס `Surface` עם `<h2>` **"על המשחק"**: פסקת תיאור קצרה ורשימת הוראות. נוסח מוצע (בלשון יחיד, בהתאם להודעות הקיימות ב-DESIGN "ודא… ולחץ שוב"):
   - תיאור: "סיימון הוא משחק זיכרון: המשחק מציג רצף של צבעים וצלילים, ואתה צריך לחזור עליו."
   - "לחץ על "התחל משחק"."
   - "צפה ברצף הצבעים והקשב לצלילים."
   - "לחץ על הצבעים באותו הסדר."
   - "בכל שלב נוסף צבע אחד לרצף. טעות אחת מסיימת את המשחק."
   - "השלם את כל 10 השלבים כדי לנצח."
   - "ודא שהטלפון אינו במצב שקט, כדי לשמוע את הצלילים." (דרישת PRD §4.4)
3. `<h2>` **"10 המשחקים האחרונים"**.
4. חיווי ריק: **"עדיין אין משחקים שמורים."** – בטקסט `Soft Gray`.
5. אין כפתור **"מחק היסטוריה"** – הוא מוצג רק כשיש רשומות (M4).

### 4.12 עיצוב גלובלי – `index.css` / `App.css`
- **CSS Variables** ב-`:root`: `--color-green #00D26A`, `--color-red #FF3B30`, `--color-yellow #FFD600`, `--color-blue #00A3FF`, `--color-charcoal #0F0F0F`, `--color-soft-gray #E5E5E5`, `--color-white #FFFFFF`, `--color-bg #0A1628`, `--color-surface #12213A`, `--color-border #1E3556`; ריווחים `--space-1..4` = `8/12/16/24px`; רדיוסים.
- **Typography:** `font-family: 'Heebo', Arial, sans-serif`; Classes/סלקטורים ל-H1 32/700, H2 24/700, H3 20/600, Body 16/400, Caption 14/400, Button 16/600.
- **Reset:** `box-sizing: border-box`, `margin: 0`, `body` ברקע `--color-bg` וטקסט לבן, `text-align: start`.
- **פריסה:** `.app` – `min-height: 100dvh`, Flex אנכי, רוחב מרבי ~`480px` ממורכז (Mobile-First; אין עיצוב ייעודי ל-Desktop), ריפוד צדדי `16px`. ללא גלילה אופקית – כל רוחב מוגבל ב-`min()`/`max-width: 100%`, בלי `overflow-x: hidden` שמסתיר בעיות.
- **Primary Button** (`.btn-primary`): רקע `--color-blue`, טקסט לבן `16px Semibold`, רוחב מלא עד ~`320px`, גובה ≥ `48px`, פינות מעוגלות, צל רך, מצב `:active` מעט כהה/מוקטן, `:focus-visible` עם קו מתאר.
- **Card** (`.card`): `Surface`, גבול `1px Border`, רדיוס `16px`, ריפוד `16px`.
- קווי הקשת הדקורטיביים ברקע ה-Mockups **לא** ימומשו – קישוט בלבד, לא מופיע בטקסט של DESIGN; הפשטה מכוונת.
- `@media (prefers-reduced-motion: reduce)` – ביטול מעברי CSS (מכין את הקרקע ל-M2, ללא השפעה על התנהגות).

## 5. בדיקות אוטומטיות

**`src/test/App.test.tsx`** (React Testing Library, `fireEvent`):
- בטעינה מוצג מסך הבית: כותרת "סיימון", הטקסט "שלב 1 מתוך 10", כפתור "התחל משחק", וארבעה כפתורים בשמות "ירוק", "אדום", "צהוב", "כחול".
- כפתור "בית" בניווט מסומן `aria-current="page"`.
- לחיצה על "אודות" מציגה כותרת "אודות", "על המשחק", תזכורת המצב השקט, ו-"עדיין אין משחקים שמורים."; הלוח כבר לא מוצג; "אודות" מסומן כפעיל.
- אין כפתור "מחק היסטוריה" במסך אודות.
- לחיצה על "בית" מחזירה את מסך הבית.
- יש בניווט בדיוק שני כפתורים (אין מסך שלישי).

**`src/test/colors.test.ts`:**
- `COLORS` מכיל בדיוק ארבעה צבעים, והמיפוי ל-`gridArea` הוא ירוק=למעלה-שמאל, אדום=למעלה-ימין, צהוב=למטה-שמאל, כחול=למטה-ימין.

## 6. GitHub Actions – `.github/workflows/deploy.yml`

- **Triggers:** `push` ל-`main` + `workflow_dispatch` (הפעלה ידנית).
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`.
- **Concurrency:** `group: pages`, `cancel-in-progress: false`.
- **Job `build`** (`ubuntu-latest`):
  1. `actions/checkout`
  2. `actions/setup-node` עם `node-version: 24` (LTS, זהה לגרסה המקומית) ו-`cache: npm`
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm test`
  6. `npm run build`
  7. `actions/configure-pages`
  8. `actions/upload-pages-artifact` עם `path: dist`
- **Job `deploy`** (`needs: build`, `environment: github-pages` עם `url` מתוך תוצאת הפריסה): `actions/deploy-pages`.
- גרסאות ה-Actions: ה-Major העדכנית בזמן הבנייה (לבדוק בתיעוד הרשמי, לא לנחש).
- Build שנכשל לא נפרס, כי `deploy` תלוי ב-`build`.

## 7. סדר העבודה בשלב הבנייה

1. יצירת `package.json`, קובצי TypeScript ו-`vite.config.ts`; `npm install` של התלויות.
2. `index.html`, `main.tsx`, `index.css` עם ה-Tokens.
3. `colors.ts`, `constants.ts`, `SimonBoard`.
4. `HomeScreen`, `AboutScreen`, `BottomNav`, `App`.
5. בדיקות; הרצת `npm run typecheck`, `npm test`, `npm run build` – עד שכולם עוברים.
6. **בדיקה ויזואלית עצמית:** הרצת `npm run dev`, פתיחה בדפדפן המובנה ב-`http://localhost:5173/simon-game/` בגודל טלפון (375×812) ובמצב רוחב:
   - השוואה ל-Mockups (מצב "בית – התחלה" ומסך "אודות").
   - בדיקה שאין גלילה אופקית (`scrollWidth <= clientWidth`) בשני המסכים ובשתי האוריינטציות.
   - מעבר בית ↔ אודות ללא רענון (אין בקשת מסמך חדשה ברשת).
   - בדיקה ש-`npm run preview` (Build) נטען תחת `/simon-game/` בלי 404 לנכסים.
   - סגירת השרתים בסיום.
7. עדכון `CLAUDE.md` (פקודות הרצה).
8. **עצירה לפני פריסה:** הדרכת המשתמש צעד אחר צעד:
   - לוודא שה-Repository `simon-game` ציבורי: GitHub → Settings → General → Danger Zone → Change visibility.
   - Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   - בקשת אישור מפורש ל-commit ו-Push (לפי CLAUDE.md).
9. אחרי האישור וה-Push: מעקב אחרי ריצת ה-Workflow (`gh run watch`), בדיקה שהכתובת `https://eyalg1980.github.io/simon-game/` נטענת ושכל קובצי ה-JS/CSS/גופן מחזירים 200.
10. סימון 🟡 ליד Milestone 1 ב-`MILESTONES.md`, וסיכום מול ה-Definition of Done. הבדיקה בטלפון האמיתי היא של המשתמש.

## 8. מיפוי ל-Definition of Done

| תנאי | איך מתקיים / נבדק |
|---|---|
| `build` ו-typecheck עוברים; בדיקת Render/Navigation עוברת | סקריפטים `build`/`typecheck`/`test`; `App.test.tsx` |
| שני מסכים, מעבר ללא רענון, אין מסך שלישי | State ב-`App` + כפתורי `button`; בדיקה אוטומטית + בדיקת רשת בדפדפן |
| ארבעת הרבעים במיקום הנכון, חיווי שלב, "התחל משחק"; אודות עם הסבר והיסטוריה ריקה | `colors.ts` + `colors.test.ts`; `App.test.tsx`; השוואה ל-Mockups |
| עברית, RTL, נוח בטלפון אנכי, ללא גלילה אופקית | `lang="he" dir="rtl"`; בדיקה ויזואלית ב-375×812 ובדיקת `scrollWidth` |
| לא נוספו יכולות מחוץ ל-PRD; אין Backend/DB | אין כפתורי הגדרות/סאונד, אין תלויות שרת |
| Workflow עובר ומפרסם; האתר נפתח ב-HTTPS בלי 404 | `deploy.yml`; בדיקת ריצת Actions ובקשות לנכסים; בדיקה בטלפון של המשתמש |

## 9. החלטות ונקודות לתשומת לב

- **אין צורך ב-ADR חדש** אם המימוש נצמד לתוכנית: כל ההחלטות המהותיות (ניווט ב-State, לוח ב-Grid, `base`, פריסה מ-M1) כבר מתועדות ב-ARCHITECTURE וב-ADR-1/ADR-8. אם תידרש סטייה – תתועד כ-ADR-10.
- **`<link rel="icon" href="data:,">`** – פתרון זמני שמונע 404 ל-Favicon עד M5.
- **נוסח ההוראות** במסך אודות הוא הצעה (ה-PRD משאיר אותו ליישום); אפשר לשנות לפי בקשה.
- **כפתור "התחל משחק"** נראה פעיל אך לא עושה דבר ב-M1 – בהתאם ל"תוצר המצופה".
