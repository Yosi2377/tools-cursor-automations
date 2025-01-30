export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export type Card = {
  suit: string;
  rank: string;
  faceUp: boolean;
};

export type PlayerPosition = "bottom" | "bottomLeft" | "left" | "topLeft" | "top" | "topRight" | "right" | "bottomRight";

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

export interface Room {
  id: string;
  name: string;
  max_players: number;
  min_bet: number;
  created_at: string;
  is_active: boolean;
  with_bots: boolean;
  actual_players: number;
}