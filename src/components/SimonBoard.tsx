import { COLORS } from '../game/colors.ts';
import './SimonBoard.css';

export default function SimonBoard() {
  return (
    <div className="simon-board">
      {COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`simon-board__pad simon-board__pad--${color.id} simon-board__pad--${color.position}`}
          aria-label={color.label}
          data-color={color.id}
        />
      ))}
      {/* Decorative center disc: no text, no input (ADR-1) */}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
