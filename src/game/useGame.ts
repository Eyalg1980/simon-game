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
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [presentedColor, setPresentedColor] = useState<ColorId | null>(null);
  const [pressedColor, setPressedColor] = useState<ColorId | null>(null);
  // Keyed by presentationId / gameId so no stale value shows for a single frame
  const [roundRevealedFor, setRoundRevealedFor] = useState(-1);
  const [resultRevealedFor, setResultRevealedFor] = useState(-1);
  const [audioError, setAudioError] = useState(false);

  const startingRef = useRef(false);
  const activePress = useRef<ActivePress | null>(null);
  const pendingRelease = useRef<PendingRelease | null>(null);

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

  // End of game: the message, end sound and (win only) confetti appear after a short delay.
  // Confetti is cleared when leaving the won state.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const { status, gameId } = state;
    const timer = setTimeout(() => {
      setResultRevealedFor(gameId);
      if (status === 'won') {
        playWin();
        fireConfetti();
      } else {
        playLoss();
      }
    }, TIMING.RESULT_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (status === 'won') clearConfetti();
    };
  }, [state.status, state.gameId]);

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

  async function startGame() {
    if (startingRef.current || state.status !== 'idle') return;
    startingRef.current = true;
    try {
      // Audio must be unlocked inside the gesture; never start a silent game (ARCHITECTURE §2.4)
      const ok = await unlockAudio();
      if (ok) {
        setAudioError(false);
        dispatch({ type: 'start', firstColor: randomColor() });
      } else {
        setAudioError(true);
      }
    } finally {
      startingRef.current = false;
    }
  }

  function dismiss() {
    dispatch({ type: 'dismiss' });
  }

  // Temporary for Milestone 2: leaving to "אודות" cancels an active game. Replaced by pause in M3.
  function abandon() {
    if (state.status !== 'presenting' && state.status !== 'awaitingInput') return;
    dispatch({ type: 'abandon' });
    finishPendingRelease();
    activePress.current?.stopTone();
    activePress.current = null;
    setPressedColor(null);
    stopAll();
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
    dismiss,
    abandon,
    onPadPointerDown,
    onPadKeyDown,
  };
}

export type Game = ReturnType<typeof useGame>;
