export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  position: "bottom" | "left" | "top" | "right";
  isActive: boolean;
  currentBet: number;
  isTurn: boolean;
  score?: number;
  timeRemaining?: number;
}

export type GameState = "waiting" | "dealing" | "betting" | "showdown";

export interface GameContext {
  players: Player[];
  pot: number;
  communityCards: Card[];
  currentPlayer: number;
  gameState: GameState;
  minimumBet: number;
  currentBet: number;
  turnTimer?: number;
}