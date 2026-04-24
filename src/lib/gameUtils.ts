export interface CheckersPiece {
  id: string;
  player: 'red' | 'black';
  isKing: boolean;
}

export const createCheckersInitialBoard = () => {
  const board: (CheckersPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = (r % 2 === 0 ? 1 : 0); c < 8; c += 2) {
      board[r][c] = { id: `p-${r}-${c}`, player: 'black', isKing: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = (r % 2 === 0 ? 1 : 0); c < 8; c += 2) {
      board[r][c] = { id: `p-${r}-${c}`, player: 'red', isKing: false };
    }
  }
  return board;
};

export const createTicTacToeInitialBoard = () => Array(9).fill(null);

export type LudoColor = 'red' | 'blue' | 'yellow' | 'green';

export interface LudoPiece {
  id: string;
  color: LudoColor;
  position: number | 'home' | 'finish'; // number: index on board/home-path
}

export interface LudoGameState {
  players: {
    uid: string;
    color: LudoColor;
    displayName: string;
    isBot: boolean;
  }[];
  pieces: LudoPiece[];
  turn: LudoColor;
  diceValue: number | null;
  isRolling?: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: LudoColor | null;
}

export const createLudoInitialPieces = (activeColors?: LudoColor[]): LudoPiece[] => {
  const colors: LudoColor[] = activeColors || ['red', 'green', 'yellow', 'blue'];
  const pieces: LudoPiece[] = [];
  colors.forEach(color => {
    for (let i = 0; i < 4; i++) {
      pieces.push({
        id: `${color}-${i}`,
        color: color,
        position: 'home'
      });
    }
  });
  return pieces;
};
