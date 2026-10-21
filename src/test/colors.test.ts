import { COLORS } from '../game/colors.ts';

describe('COLORS', () => {
  it('has exactly four colors in the required board positions', () => {
    const positions = Object.fromEntries(COLORS.map((c) => [c.id, c.position]));
    expect(positions).toEqual({
      green: 'top-left',
      red: 'top-right',
      yellow: 'bottom-left',
      blue: 'bottom-right',
    });
  });
});
