export type ColorId = 'green' | 'red' | 'yellow' | 'blue';

export type BoardPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type SimonColor = {
  id: ColorId;
  label: string;
  position: BoardPosition;
};

// Spatial layout of the board (DESIGN §1.1). Positions are physical and do not flip in RTL.
export const COLORS: readonly SimonColor[] = [
  { id: 'green', label: 'ירוק', position: 'top-left' },
  { id: 'red', label: 'אדום', position: 'top-right' },
  { id: 'yellow', label: 'צהוב', position: 'bottom-left' },
  { id: 'blue', label: 'כחול', position: 'bottom-right' },
];
