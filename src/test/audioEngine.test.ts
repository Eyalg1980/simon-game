import { TONE_FREQUENCIES, startTone, stopAll, unlockAudio } from '../audio/audioEngine.ts';

describe('audioEngine', () => {
  it('gives each of the four colors a different pitch', () => {
    const frequencies = Object.values(TONE_FREQUENCIES);
    expect(frequencies).toHaveLength(4);
    expect(new Set(frequencies).size).toBe(4);
  });

  it('reports failure without throwing when Web Audio is unavailable', async () => {
    await expect(unlockAudio()).resolves.toBe(false);
    expect(() => startTone('green')()).not.toThrow();
    expect(() => stopAll()).not.toThrow();
  });
});
