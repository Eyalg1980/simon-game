import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { playLoss, playWin, startTone, stopAll, unlockAudio } from '../audio/audioEngine.ts';
import { clearConfetti, fireConfetti } from './celebration.ts';
import type { ColorId } from './colors.ts';
import { TIMING } from './constants.ts';
import { gameReducer, initialGameState } from './gameReducer.ts';
import { randomColor } from './random.ts';

type ActivePress = { pointerId: number | null; startedAt: number; stopTone: () => void };
type PendingRelease = { timer: ReturnType<typeof setTimeout>; finish: () => void };

// Game state lives in App so switching screens does not unmount it (ADR-2).
// onHome: whether the home screen is the one shown right now.
export function useGame(onHome: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [presentedColor, setPresentedColor] = useState<ColorId | null>(null);
  const [pressedColor, setPressedColor] = useState<ColorId | null>(null);
  // Keyed by presentationId / gameId so no stale value shows for a single frame
  const [roundRevealedFor, setRoundRevealedFor] = useState(-1);
  const [resultRevealedFor, setResultRevealedFor] = useState(-1);
  const [audioError, setAudioError] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => document.visibilityState === 'hidden');

  const unlockingRef = useRef(false);
  // Incremented on every pause; an audio unlock that spans a pause is dropped (ADR-13)
  const interruptRef = useRef(0);
  // gameId whose result was shown, and gameId whose result wait was cut by a pause (ADR-12)
  const resultShownRef = useRef(-1);
  const resultInterruptedRef = useRef(-1);
  const activePress = useRef<ActivePress | null>(null);
  const pendingRelease = useRef<PendingRelease | null>(null);

  const away = !onHome || pageHidden;

  // Sequence Controller: one cancellable timeline per presentation (ADR-10)
  useEffect(() => {
    if (state.status !== 'presenting') return;
    const { presentationId, sequence, intro } = state;
    const controller = new AbortController();
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopTone: (() => void) | null = null;

    const at = (ms: number, fn: () => void) => {
      timers.push(
        setTimeout(() => {
          if (!controller.signal.aborted) fn();
        }, ms),
      );
    };

    let t = 0;
    if (intro === 'nextRound') {
      t += TIMING.ROUND_DONE_HOLD_MS;
      at(t, () => setRoundRevealedFor(presentationId));
      t += TIMING.NEXT_ROUND_DELAY_MS;
    } else {
      t += TIMING.START_DELAY_MS;
    }
    sequence.forEach((color, i) => {
      at(t, () => {
        setPresentedColor(color);
        stopTone = startTone(color);
      });
      t += TIMING.TONE_MS;
      at(t, () => {
        setPresentedColor(null);
        stopTone?.();
        stopTone = null;
      });
      if (i < sequence.length - 1) t += TIMING.GAP_MS;
    });
    at(t, () => dispatch({ type: 'presentationDone', presentationId }));

    return () => {
      controller.abort();
      timers.forEach(clearTimeout);
      stopTone?.();
      setPresentedColor(null);
    };
    // The sequence only changes together with presentationId
  }, [state.status, state.presentationId]);

  // End of game: the message, end sound and (win only) confetti appear after a short delay,
  // and only while the home screen is shown. If the player left during the delay, they appear
  // at once on return (ADR-12). Confetti is cleared when leaving the won state or the screen.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const { status, gameId } = state;
    const clear = () => {
      if (status === 'won') clearConfetti();
    };
    if (resultShownRef.current === gameId) return clear;
    if (away) {
      resultInterruptedRef.current = gameId;
      return;
    }
    const reveal = () => {
      resultShownRef.current = gameId;
      setResultRevealedFor(gameId);
      if (status === 'won') {
        playWin();
        fireConfetti();
      } else {
        playLoss();
      }
    };
    if (resultInterruptedRef.current === gameId) {
      reveal();
      return clear;
    }
    const timer = setTimeout(reveal, TIMING.RESULT_DELAY_MS);
    return () => {
      clearTimeout(timer);
      clear();
    };
  }, [state.status, state.gameId, away]);

  const finishPendingRelease = useCallback(() => {
    const pending = pendingRelease.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.finish();
  }, []);

  const releasePress = useCallback((pointerId: number | null) => {
    const press = activePress.current;
    if (!press || press.pointerId !== pointerId) return;
    activePress.current = null;
    // Highlight and tone last at least PRESS_MIN_MS, or as long as the finger is down
    const remaining = Math.max(0, TIMING.PRESS_MIN_MS - (Date.now() - press.startedAt));
    const finish = () => {
      press.stopTone();
      setPressedColor(null);
      pendingRelease.current = null;
    };
    if (remaining === 0) {
      finish();
    } else {
      pendingRelease.current = { timer: setTimeout(finish, remaining), finish };
    }
  }, []);

  function beginPress(color: ColorId, pointerId: number | null) {
    // A second simultaneous touch is ignored until the first finger is released
    if (state.status !== 'awaitingInput' || activePress.current) return;
    finishPendingRelease();
    activePress.current = { pointerId, startedAt: Date.now(), stopTone: startTone(color) };
    setPressedColor(color);
    dispatch({ type: 'press', color, nextColor: randomColor() });
  }

  // The release is caught on window: the pad may become disabled while the finger is down
  useEffect(() => {
    const onRelease = (e: PointerEvent) => releasePress(e.pointerId);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    return () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
    };
  }, [releasePress]);

  // Silence everything if the app unmounts
  useEffect(
    () => () => {
      finishPendingRelease();
      activePress.current?.stopTone();
      activePress.current = null;
      stopAll();
    },
    [finishPendingRelease],
  );

  // One pause for every trigger: leaving to "אודות", hiding the app and pagehide (ADR-3).
  // Light, sound and timers stop at once; the reducer ignores it unless a game is active.
  const pause = useCallback(() => {
    interruptRef.current += 1;
    dispatch({ type: 'pause' });
    finishPendingRelease();
    activePress.current?.stopTone();
    activePress.current = null;
    setPressedColor(null);
    stopAll();
  }, [finishPendingRelease]);

  // Becoming visible again does not resume: the player must press "המשך משחק"
  useEffect(() => {
    const onHide = () => {
      setPageHidden(true);
      pause();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onHide();
      else setPageHidden(false);
    };
    const onPageShow = () => setPageHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [pause]);

  function onPadPointerDown(color: ColorId, e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    beginPress(color, e.pointerId);
  }

  function onPadKeyDown(color: ColorId, e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat || activePress.current) return;
    beginPress(color, null);
    releasePress(null);
  }

  // Audio must be unlocked inside the gesture; never start a silent game (ARCHITECTURE §2.4).
  // A second tap while unlocking is ignored, and so is the result if the player left meanwhile.
  async function withAudio(action: () => void) {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    const interruptsBefore = interruptRef.current;
    try {
      const ok = await unlockAudio();
      if (interruptRef.current !== interruptsBefore) return;
      if (ok) {
        setAudioError(false);
        action();
      } else {
        setAudioError(true);
      }
    } finally {
      unlockingRef.current = false;
    }
  }

  async function startGame() {
    if (state.status !== 'idle') return;
    await withAudio(() => dispatch({ type: 'start', firstColor: randomColor() }));
  }

  async function resumeGame() {
    if (state.status !== 'paused') return;
    await withAudio(() => dispatch({ type: 'resume' }));
  }

  function dismiss() {
    dispatch({ type: 'dismiss' });
  }

  const displayRound =
    state.status === 'presenting' &&
    state.intro === 'nextRound' &&
    roundRevealedFor !== state.presentationId
      ? state.round - 1
      : state.round;

  const resultVisible =
    (state.status === 'won' || state.status === 'lost') && resultRevealedFor === state.gameId;

  return {
    state,
    displayRound,
    litColor: presentedColor ?? pressedColor,
    resultVisible,
    audioError,
    startGame,
    resumeGame,
    pause,
    dismiss,
    onPadPointerDown,
    onPadKeyDown,
  };
}

export type Game = ReturnType<typeof useGame>;
