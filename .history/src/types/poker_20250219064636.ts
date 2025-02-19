export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PlayerPosition = "bottom" | "bottomLeft" | "left" | "topLeft" | "top" | "topRight" | "right" | "bottomRight" | "leftTop" | "leftBottom";

export interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  position: PlayerPosition;
  isActive: boolean;
  currentBet: number;
  isTurn: boolean;
  score?: number;
}

export type GameState = "waiting" | "dealing" | "betting" | "showdown";

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
  roomId?: string;
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