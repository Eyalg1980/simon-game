import type { KeyboardEvent, PointerEvent } from 'react';
import { COLORS, type ColorId } from '../game/colors.ts';
import './SimonBoard.css';

export type BoardMode = 'idle' | 'presenting' | 'input' | 'locked';

type Props = {
  mode: BoardMode;
  litColor: ColorId | null;
  onPadPointerDown: (color: ColorId, e: PointerEvent) => void;
  onPadKeyDown: (color: ColorId, e: KeyboardEvent) => void;
};

export default function SimonBoard({ mode, litColor, onPadPointerDown, onPadKeyDown }: Props) {
  const boardClass = mode === 'presenting' ? 'simon-board simon-board--dimmed' : 'simon-board';

  return (
    <div className={boardClass} data-mode={mode}>
      {COLORS.map((color) => {
        const lit = color.id === litColor;
        return (
          <button
            key={color.id}
            type="button"
            className={`simon-board__pad simon-board__pad--${color.id} simon-board__pad--${color.position}${
              lit ? ' simon-board__pad--lit' : ''
            }`}
            aria-label={color.label}
            data-color={color.id}
            data-lit={lit || undefined}
            // Input is accepted only on the player's turn
            disabled={mode !== 'input'}
            onPointerDown={(e) => onPadPointerDown(color.id, e)}
            onKeyDown={(e) => onPadKeyDown(color.id, e)}
            onContextMenu={(e) => e.preventDefault()}
          />
        );
      })}
      {/* Decorative center disc: no text, no input (ADR-1) */}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
