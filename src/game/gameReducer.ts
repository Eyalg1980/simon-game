import type { ColorId } from './colors.ts';
import { TOTAL_ROUNDS } from './constants.ts';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: ColorId[];
  /** Current round, 1–10 */
  round: number;
  /** Index of the next expected press in the current round */
  inputIndex: number;
  /** Rounds completed successfully, 0–10 */
  completedRounds: number;
  /** Increments on every start; identifies a single game */
  gameId: number;
  /** Increments on every presentation and cancellation; stale playback is ignored */
  presentationId: number;
  /** Which wait precedes the first color of the current presentation */
  intro: 'start' | 'nextRound';
};

export type GameAction =
  | { type: 'start'; firstColor: ColorId }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: ColorId; nextColor: ColorId }
  | { type: 'dismiss' }
  | { type: 'pause' }
  | { type: 'resume' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  intro: 'start',
};

// Pure reducer: no audio, timers or storage. Invalid actions return the same state.
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        ...initialGameState,
        status: 'presenting',
        sequence: [action.firstColor],
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
        intro: 'start',
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) {
        return state;
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost' };
      }
      if (state.inputIndex < state.sequence.length - 1) {
        return { ...state, inputIndex: state.inputIndex + 1 };
      }
      // Round completed. The transition belongs to the next round (ARCHITECTURE §2.3 rule 10).
      if (state.round === TOTAL_ROUNDS) {
        return { ...state, status: 'won', completedRounds: TOTAL_ROUNDS };
      }
      return {
        ...state,
        status: 'presenting',
        completedRounds: state.round,
        round: state.round + 1,
        sequence: [...state.sequence, action.nextColor],
        inputIndex: 0,
        presentationId: state.presentationId + 1,
        intro: 'nextRound',
      };
    }

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId,
      };

    // Leaving to "אודות" or hiding the app (ADR-3). The sequence and round are kept;
    // partial input is dropped and the running presentation becomes stale.
    case 'pause':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state;
      return {
        ...state,
        status: 'paused',
        inputIndex: 0,
        presentationId: state.presentationId + 1,
      };

    // "המשך משחק": the full sequence of the same round is presented again from the start
    case 'resume':
      if (state.status !== 'paused') return state;
      return {
        ...state,
        status: 'presenting',
        inputIndex: 0,
        presentationId: state.presentationId + 1,
        intro: 'start',
      };

    default:
      return state;
  }
}
