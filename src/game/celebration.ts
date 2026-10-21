import confetti from 'canvas-confetti';

// Game colors only (DESIGN §2.4: multicolor confetti above the win message)
const CONFETTI_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

export function fireConfetti() {
  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 40,
    origin: { y: 0.45 },
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
  });
}

export function clearConfetti() {
  confetti.reset();
}
