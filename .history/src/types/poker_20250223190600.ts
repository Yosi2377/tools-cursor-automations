export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  isHidden?: boolean;
}

export type PlayerPosition = "bottom" | "bottomLeft" | "left" | "topLeft" | "top" | "topRight" | "right" | "bottomRight" | "leftTop" | "leftBottom";

export interface Player {
  id: string;
  name: string;
  position: string;
  chips: number;
  cards: Card[];
  isActive: boolean;
  isTurn: boolean;
  currentBet: number;
  lastAction?: string;
  score: number;
  isVisible: boolean;
  hasActed: boolean;
  stack: number;
  hasFolded: boolean;
}

export type GameState = "waiting" | "dealing" | "betting" | "showdown" | "finished";

export interface GameContext {
  gameId?: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  rake: number;
  currentBet: number;
  gameState: GameState;
  currentPlayer: number;
  minimumBet: number;
  dealerPosition: number;
  roomId?: string;
  lastAction?: {
    player: string;
    action: string;
    amount?: number;
  };
  isInitialized: boolean;
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