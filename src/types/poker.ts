export type Card = {
  suit: string;
  rank: string;
  faceUp: boolean;
};

export type Player = {
  id: number;
  name: string;
  position: string;
  chips: number;
  cards: Card[];
  isActive: boolean;
  currentBet: number;
  isTurn: boolean;
  score: number;
};

export type GameState = "waiting" | "betting" | "ended";

export interface GameContext {
  players: Player[];
  pot: number;
  rake: number;
  communityCards: Card[];
  currentPlayer: number;
  gameState: GameState;
  minimumBet: number;
  currentBet: number;
  dealerPosition: number;
  gameId?: string;
}
