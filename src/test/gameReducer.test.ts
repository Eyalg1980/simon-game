import type { ColorId } from '../game/colors.ts';
import { gameReducer, initialGameState, type GameState } from '../game/gameReducer.ts';

const COLORS_CYCLE: ColorId[] = ['green', 'red', 'yellow', 'blue', 'green', 'green', 'blue', 'red', 'yellow', 'blue'];

function started(firstColor: ColorId = COLORS_CYCLE[0]): GameState {
  return gameReducer(initialGameState, { type: 'start', firstColor });
}

function finishPresentation(state: GameState): GameState {
  return gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId });
}

// Replays the whole sequence correctly; the next color comes from COLORS_CYCLE.
function completeRound(state: GameState): GameState {
  let s = finishPresentation(state);
  for (const color of s.sequence) {
    s = gameReducer(s, { type: 'press', color, nextColor: COLORS_CYCLE[s.sequence.length] });
  }
  return s;
}

function reachRound(round: number): GameState {
  let s = started();
  while (s.round < round) s = completeRound(s);
  return s;
}

function wrongColor(color: ColorId): ColorId {
  return color === 'green' ? 'red' : 'green';
}

describe('gameReducer', () => {
  it('starts round 1 with a single color and presents it', () => {
    const s = started('yellow');
    expect(s.status).toBe('presenting');
    expect(s.sequence).toEqual(['yellow']);
    expect(s.round).toBe(1);
    expect(s.completedRounds).toBe(0);
    expect(s.intro).toBe('start');
  });

  it('has sequence lengths 1, 2 and 10 in rounds 1, 2 and 10, each extending the previous one', () => {
    let s = started();
    expect(s.sequence).toHaveLength(1);
    let previous = s.sequence;
    for (let round = 2; round <= 10; round++) {
      s = completeRound(s);
      expect(s.round).toBe(round);
      expect(s.sequence).toHaveLength(round);
      expect(s.sequence.slice(0, previous.length)).toEqual(previous);
      expect(s.completedRounds).toBe(round - 1);
      expect(s.intro).toBe('nextRound');
      previous = s.sequence;
    }
  });

  it('allows the same color to repeat', () => {
    let s = finishPresentation(started('blue'));
    s = gameReducer(s, { type: 'press', color: 'blue', nextColor: 'blue' });
    expect(s.sequence).toEqual(['blue', 'blue']);
  });

  it('ignores presses while presenting, idle or finished', () => {
    const presenting = started('green');
    expect(gameReducer(presenting, { type: 'press', color: 'green', nextColor: 'red' })).toBe(presenting);
    expect(gameReducer(initialGameState, { type: 'press', color: 'green', nextColor: 'red' })).toBe(
      initialGameState,
    );
    const lost = gameReducer(finishPresentation(presenting), {
      type: 'press',
      color: 'red',
      nextColor: 'red',
    });
    expect(gameReducer(lost, { type: 'press', color: 'green', nextColor: 'red' })).toBe(lost);
  });

  it('ignores a stale presentationDone', () => {
    const s = started();
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId - 1 })).toBe(s);
  });

  it('advances the input index on a correct press that does not end the round', () => {
    let s = finishPresentation(reachRound(3));
    s = gameReducer(s, { type: 'press', color: s.sequence[0], nextColor: 'red' });
    expect(s.status).toBe('awaitingInput');
    expect(s.inputIndex).toBe(1);
  });

  it('loses immediately on a wrong press in round 1 with 0 completed rounds', () => {
    let s = finishPresentation(started('green'));
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'red' });
    expect(s.status).toBe('lost');
    expect(s.completedRounds).toBe(0);
    expect(s.round).toBe(1);
  });

  it('loses in an advanced round with the rounds completed so far', () => {
    let s = finishPresentation(reachRound(5));
    s = gameReducer(s, { type: 'press', color: s.sequence[0], nextColor: 'red' });
    s = gameReducer(s, { type: 'press', color: wrongColor(s.sequence[1]), nextColor: 'red' });
    expect(s.status).toBe('lost');
    expect(s.round).toBe(5);
    expect(s.completedRounds).toBe(4);
  });

  it('wins after completing round 10 and never reaches round 11', () => {
    let s = completeRound(reachRound(10));
    expect(s.status).toBe('won');
    expect(s.completedRounds).toBe(10);
    expect(s.round).toBe(10);
    expect(s.sequence).toHaveLength(10);
    const after = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    expect(after).toBe(s);
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId })).toBe(s);
  });

  it('dismiss returns to idle and the next start is a new game with a new sequence', () => {
    let s = finishPresentation(started('green'));
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'red' });
    const firstGameId = s.gameId;
    s = gameReducer(s, { type: 'dismiss' });
    expect(s.status).toBe('idle');
    expect(s.sequence).toEqual([]);
    expect(s.round).toBe(1);
    expect(s.gameId).toBe(firstGameId);
    s = gameReducer(s, { type: 'start', firstColor: 'blue' });
    expect(s.gameId).toBe(firstGameId + 1);
    expect(s.sequence).toEqual(['blue']);
  });

  it('dismiss is ignored while a game is active', () => {
    const s = started();
    expect(gameReducer(s, { type: 'dismiss' })).toBe(s);
  });

  it('pause while presenting keeps the sequence and round and invalidates the presentation', () => {
    const presenting = reachRound(3);
    const paused = gameReducer(presenting, { type: 'pause' });
    expect(paused.status).toBe('paused');
    expect(paused.presentationId).toBe(presenting.presentationId + 1);
    expect(paused.sequence).toEqual(presenting.sequence);
    expect(paused.round).toBe(3);
    expect(paused.completedRounds).toBe(2);
    expect(paused.gameId).toBe(presenting.gameId);
    // The old presentation can no longer hand over to the player
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: presenting.presentationId })).toBe(
      paused,
    );
  });

  it('pause while awaiting input drops the partial input', () => {
    let s = finishPresentation(reachRound(4));
    s = gameReducer(s, { type: 'press', color: s.sequence[0], nextColor: 'red' });
    s = gameReducer(s, { type: 'press', color: s.sequence[1], nextColor: 'red' });
    expect(s.inputIndex).toBe(2);
    const paused = gameReducer(s, { type: 'pause' });
    expect(paused.status).toBe('paused');
    expect(paused.inputIndex).toBe(0);
    expect(paused.sequence).toEqual(s.sequence);
    expect(paused.round).toBe(4);
  });

  it('pause right after a completed round keeps the next round and its added color', () => {
    const next = completeRound(reachRound(2));
    const paused = gameReducer(next, { type: 'pause' });
    expect(paused.round).toBe(3);
    expect(paused.sequence).toHaveLength(3);
    expect(paused.completedRounds).toBe(2);
  });

  it('pause does not affect idle, finished or already paused games', () => {
    expect(gameReducer(initialGameState, { type: 'pause' })).toBe(initialGameState);
    const won = completeRound(reachRound(10));
    expect(gameReducer(won, { type: 'pause' })).toBe(won);
    const lost = gameReducer(finishPresentation(started('green')), {
      type: 'press',
      color: 'red',
      nextColor: 'red',
    });
    expect(gameReducer(lost, { type: 'pause' })).toBe(lost);
    const paused = gameReducer(reachRound(2), { type: 'pause' });
    expect(gameReducer(paused, { type: 'pause' })).toBe(paused);
  });

  it('ignores presses while paused', () => {
    const paused = gameReducer(finishPresentation(reachRound(2)), { type: 'pause' });
    expect(gameReducer(paused, { type: 'press', color: paused.sequence[0], nextColor: 'red' })).toBe(paused);
  });

  it('resume presents the same full sequence of the same round again', () => {
    let s = finishPresentation(reachRound(3));
    s = gameReducer(s, { type: 'press', color: s.sequence[0], nextColor: 'red' });
    const paused = gameReducer(s, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(resumed.status).toBe('presenting');
    expect(resumed.intro).toBe('start');
    expect(resumed.inputIndex).toBe(0);
    expect(resumed.presentationId).toBe(paused.presentationId + 1);
    expect(resumed.sequence).toEqual(s.sequence);
    expect(resumed.round).toBe(3);
    expect(resumed.completedRounds).toBe(2);
  });

  it('resume is ignored unless the game is paused', () => {
    const presenting = started();
    expect(gameReducer(presenting, { type: 'resume' })).toBe(presenting);
    expect(gameReducer(initialGameState, { type: 'resume' })).toBe(initialGameState);
    const resumed = gameReducer(gameReducer(presenting, { type: 'pause' }), { type: 'resume' });
    expect(gameReducer(resumed, { type: 'resume' })).toBe(resumed);
  });
});
