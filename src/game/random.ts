import { COLORS, type ColorId } from './colors.ts';

// Game randomness only; no cryptographic RNG needed. Repeated colors are allowed.
// Kept in its own module so tests can replace it (ADR-2).
export function randomColor(): ColorId {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
