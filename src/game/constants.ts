export const TOTAL_ROUNDS = 10;

// Sequence pacing (DESIGN §1.1). Identical in every round: no speed-up.
export const TIMING = {
  /** Highlight and tone of each color in the sequence */
  TONE_MS: 600,
  /** Pause between two colors in the sequence */
  GAP_MS: 250,
  /** After "התחל משחק" until the first color */
  START_DELAY_MS: 1000,
  /** After a completed round: the completed round number stays on screen */
  ROUND_DONE_HOLD_MS: 1000,
  /** After the next round number appears, until its first color */
  NEXT_ROUND_DELAY_MS: 1000,
  /** After the deciding press, until the result message and end sound */
  RESULT_DELAY_MS: 1000,
  /** Minimum highlight and tone of a player press */
  PRESS_MIN_MS: 300,
} as const;
