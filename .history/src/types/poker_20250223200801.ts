export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PlayerPosition = 'bottom' | 'bottomRight' | 'right' | 'topRight' | 'top' | 'topLeft' | 'left' | 'bottomLeft';

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  chips: number;
  cards: Card[];
  isActive: boolean;
  isTurn: boolean;
  currentBet: number;
  score: number;
  isVisible: boolean;
  lastAction?: string;
  hasActed: boolean;
  hasFolded: boolean;
  stack: number;
}

export type GameState = 'waiting' | 'betting' | 'complete' | 'showdown';

export interface GameContext {
  gameId: string;
  players: Player[];
  gameState: GameState;
  currentBet: number;
  pot: number;
  rake: number;
  dealerPosition: number;
  currentPlayer: number;
  communityCards: Card[];
  minimumBet: number;
  roomId: string;
  isInitialized: boolean;
  lastAction?: string;
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

export interface GameRow {
  id: string;
  room_id: string;
  status: string;
  current_player_index: number;
  pot: number;
  current_bet: number;
  dealer_position: number;
  community_cards: string;
  rake: number;
  created_at: string;
  updated_at: string;
}

export interface GamePlayerRow {
  id: string;
  game_id: string;
  user_id: string;
  position: string;
  chips: number;
  current_bet: number;
  is_active: boolean;
  is_turn: boolean;
  cards: string;
  score: number;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
  };
  created_at: string;
  balance: number;
}

export interface GameHistoryEntry {
  id: string;
  room_id: string;
  winner_id: string;
  final_pot: number;
  created_at: string;
  players: Player[];
}