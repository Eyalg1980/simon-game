import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import confetti from 'canvas-confetti';
import App from '../App.tsx';
import * as audio from '../audio/audioEngine.ts';
import { randomColor } from '../game/random.ts';
import type { ColorId } from '../game/colors.ts';

vi.mock('../audio/audioEngine.ts', () => ({
  unlockAudio: vi.fn(),
  startTone: vi.fn(),
  playWin: vi.fn(),
  playLoss: vi.fn(),
  stopAll: vi.fn(),
}));
vi.mock('../game/random.ts', () => ({ randomColor: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

const LABELS: Record<ColorId, string> = { green: 'ירוק', red: 'אדום', yellow: 'צהוב', blue: 'כחול' };
// Includes repeats on purpose
const RANDOM_CYCLE: ColorId[] = ['green', 'red', 'red', 'yellow', 'blue', 'green', 'blue', 'yellow', 'blue', 'green', 'red'];

type Tone = { color: ColorId; start: number; end: number | null };
let tones: Tone[];
let randomCalls: number;
let nextPointerId: number;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
  tones = [];
  randomCalls = 0;
  nextPointerId = 1;
  vi.mocked(audio.unlockAudio).mockResolvedValue(true);
  vi.mocked(audio.startTone).mockImplementation((color) => {
    const tone: Tone = { color, start: Date.now(), end: null };
    tones.push(tone);
    return () => {
      tone.end ??= Date.now();
    };
  });
  vi.mocked(randomColor).mockImplementation(() => RANDOM_CYCLE[randomCalls++ % RANDOM_CYCLE.length]);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  });
}

function pad(color: ColorId) {
  return screen.getByRole('button', { name: LABELS[color] });
}

function tap(color: ColorId) {
  const pointerId = nextPointerId++;
  fireEvent.pointerDown(pad(color), { pointerId, pointerType: 'touch' });
  fireEvent.pointerUp(window, { pointerId, pointerType: 'touch' });
}

function wrongOf(color: ColorId): ColorId {
  return color === 'green' ? 'red' : 'green';
}

// Total presentation time of a round, per DESIGN §1.1
function presentationMs(round: number) {
  const intro = round === 1 ? 1000 : 2000;
  return intro + round * 600 + (round - 1) * 250;
}

/** Lets the round's presentation finish and returns the colors that were shown. */
function watchRound(round: number): ColorId[] {
  const before = tones.length;
  advance(presentationMs(round));
  expect(screen.getByText('התור שלך')).toBeInTheDocument();
  return tones.slice(before).map((t) => t.color);
}

function playRound(round: number): ColorId[] {
  const sequence = watchRound(round);
  sequence.forEach(tap);
  return sequence;
}

function nav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

describe('full game', () => {
  it('presents a single color after start, with input blocked, then hands over to the player', async () => {
    renderApp();
    await clickStart();

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(pad('green')).toBeDisabled();

    advance(999);
    expect(tones).toHaveLength(0);
    advance(1);
    expect(tones).toHaveLength(1);
    expect(pad(tones[0].color)).toHaveAttribute('data-lit', 'true');
    advance(600);
    expect(pad(tones[0].color)).not.toHaveAttribute('data-lit');
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
    expect(pad('green')).toBeEnabled();
  });

  it('grows the sequence by one color per round, keeping the previous colors as its prefix', async () => {
    renderApp();
    await clickStart();
    let previous: ColorId[] = [];
    for (let round = 1; round <= 3; round++) {
      const sequence = playRound(round);
      expect(sequence).toHaveLength(round);
      expect(sequence.slice(0, previous.length)).toEqual(previous);
      previous = sequence;
    }
  });

  it('keeps the same pace in every round', async () => {
    renderApp();
    await clickStart();
    playRound(1);
    playRound(2);
    const before = tones.length;
    watchRound(3);
    const round3 = tones.slice(before);
    expect(round3).toHaveLength(3);
    for (const tone of round3) expect(tone.end! - tone.start).toBe(600);
    expect(round3[1].start - round3[0].start).toBe(850);
    expect(round3[2].start - round3[1].start).toBe(850);
  });

  it('holds the completed round number, then shows the next one before its first color', async () => {
    renderApp();
    await clickStart();
    playRound(1);

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    advance(999);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    advance(1);
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
    const before = tones.length;
    advance(999);
    expect(tones).toHaveLength(before);
    advance(1);
    expect(tones).toHaveLength(before + 1);
  });

  it('ignores presses while the sequence is presented', async () => {
    renderApp();
    await clickStart();
    advance(1000);
    const shown = tones[0].color;
    const other = pad(wrongOf(shown));
    other.removeAttribute('disabled');
    fireEvent.pointerDown(other, { pointerId: 99, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 99, pointerType: 'touch' });

    expect(tones).toHaveLength(1);
    advance(600);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('accepts only the first of two simultaneous touches', async () => {
    renderApp();
    await clickStart();
    playRound(1);
    const sequence = watchRound(2);

    fireEvent.pointerDown(pad(sequence[0]), { pointerId: 1, pointerType: 'touch' });
    // Second finger on a wrong color while the first is still down: ignored
    fireEvent.pointerDown(pad(wrongOf(sequence[1])), { pointerId: 2, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 2, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'touch' });
    tap(sequence[1]);

    advance(1000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('keeps a press highlighted for at least 300ms, or while the finger is down', async () => {
    renderApp();
    await clickStart();
    playRound(1);
    const sequence = watchRound(2);

    fireEvent.pointerDown(pad(sequence[0]), { pointerId: 50, pointerType: 'touch' });
    advance(800);
    expect(pad(sequence[0])).toHaveAttribute('data-lit', 'true');
    fireEvent.pointerUp(window, { pointerId: 50, pointerType: 'touch' });
    expect(pad(sequence[0])).not.toHaveAttribute('data-lit');
    expect(tones.at(-1)!.end! - tones.at(-1)!.start).toBe(800);

    fireEvent.pointerDown(pad(sequence[1]), { pointerId: 51, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 51, pointerType: 'touch' });
    expect(pad(sequence[1])).toHaveAttribute('data-lit', 'true');
    advance(300);
    expect(pad(sequence[1])).not.toHaveAttribute('data-lit');
    expect(tones.at(-1)!.end! - tones.at(-1)!.start).toBe(300);
  });

  it('loses on a wrong first press with 0 completed rounds, sound first and message a second later', async () => {
    renderApp();
    await clickStart();
    const [shown] = watchRound(1);
    const wrong = wrongOf(shown);
    tap(wrong);

    expect(tones.at(-1)!.color).toBe(wrong);
    expect(screen.queryByText('התור שלך')).not.toBeInTheDocument();
    advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playLoss).not.toHaveBeenCalled();
    advance(1);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'נפסלת!' })).toBeInTheDocument();
    expect(within(dialog).getByText('שלבים שהושלמו: 0')).toBeInTheDocument();
    expect(audio.playLoss).toHaveBeenCalledTimes(1);
    expect(audio.playWin).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'אישור' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
  });

  it('loses in an advanced round with the rounds completed so far', async () => {
    renderApp();
    await clickStart();
    for (let round = 1; round <= 3; round++) playRound(round);
    const sequence = watchRound(4);
    tap(sequence[0]);
    tap(wrongOf(sequence[1]));
    advance(1000);

    expect(screen.getByRole('heading', { name: 'נפסלת!' })).toBeInTheDocument();
    expect(screen.getByText('שלבים שהושלמו: 3')).toBeInTheDocument();
    expect(screen.getByText('שלב 4 מתוך 10')).toBeInTheDocument();
  });

  it('wins after round 10 with sound and confetti, and never starts round 11', async () => {
    renderApp();
    await clickStart();
    for (let round = 1; round <= 10; round++) playRound(round);

    advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    advance(1);
    expect(screen.getByRole('heading', { name: 'כל הכבוד! ניצחת!' })).toBeInTheDocument();
    expect(audio.playWin).toHaveBeenCalledTimes(1);
    expect(audio.playLoss).not.toHaveBeenCalled();
    expect(confetti).toHaveBeenCalledTimes(1);
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument();

    const toneCount = tones.length;
    advance(20000);
    expect(tones).toHaveLength(toneCount);
    expect(screen.queryByText('המשחק מציג את הרצף')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(confetti.reset).toHaveBeenCalled();
  });

  it('"אישור" returns to the start state, and the next game uses a new random sequence', async () => {
    renderApp();
    await clickStart();
    const [shown] = watchRound(1);
    tap(wrongOf(shown));
    advance(1000);

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();

    const callsBefore = randomCalls;
    await clickStart();
    expect(randomCalls).toBe(callsBefore + 1);
    const [newShown] = watchRound(1);
    expect(newShown).toBe(RANDOM_CYCLE[callsBefore % RANDOM_CYCLE.length]);
  });

  it('shows an error and stays before the game when audio cannot start', async () => {
    vi.mocked(audio.unlockAudio).mockResolvedValueOnce(false);
    renderApp();
    await clickStart();

    expect(
      screen.getByText('לא הצלחנו להפעיל את הצליל. ודא שהטלפון אינו במצב שקט ולחץ שוב.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    advance(5000);
    expect(tones).toHaveLength(0);

    await clickStart();
    expect(screen.queryByText(/לא הצלחנו להפעיל את הצליל/)).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it.each(['presenting', 'awaitingInput'] as const)(
    'leaving to "אודות" while %s cancels the game without leftover light, sound or timers',
    async (phase) => {
      renderApp();
      await clickStart();
      if (phase === 'presenting') {
        advance(1200); // first color is lit and sounding
      } else {
        playRound(1);
        const sequence = watchRound(2);
        tap(sequence[0]); // its release timer is still pending
      }

      fireEvent.click(within(nav()).getByRole('button', { name: 'אודות' }));

      expect(audio.stopAll).toHaveBeenCalled();
      expect(tones.every((t) => t.end !== null)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);

      fireEvent.click(within(nav()).getByRole('button', { name: 'בית' }));
      expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
      expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
      expect(document.querySelector('[data-lit]')).toBeNull();
    },
  );

  it('a page refresh drops the active game and nothing is persisted', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const first = renderApp();
    await clickStart();
    playRound(1);
    first.unmount();

    renderApp();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
