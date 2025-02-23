import { Card, Suit, Rank, Player, GameContext } from "../types/poker";

// Deck generation
const createDeck = (): Card[] => {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: false });
    }
  }

  return shuffleDeck(deck);
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealCards = (players: Player[]): { updatedPlayers: Player[], remainingDeck: Card[] } => {
  const deck = createDeck();
  const updatedPlayers = players.map(player => ({
    ...player,
    cards: [
      { ...deck.pop()!, faceUp: true },
      { ...deck.pop()!, faceUp: true }
    ]
  }));
  
  return { updatedPlayers, remainingDeck: deck };
};

export const placeBet = (
  gameContext: GameContext,
  playerId: number,
  betAmount: number
): GameContext => {
  const updatedPlayers = gameContext.players.map(player => {
    if (player.id === playerId) {
      return {
        ...player,
        chips: player.chips - betAmount,
        currentBet: player.currentBet + betAmount,
        isTurn: false
      };
    }
    return player;
  });

  const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
  
  return {
    ...gameContext,
    players: updatedPlayers,
    pot: gameContext.pot + betAmount,
    currentBet: Math.max(gameContext.currentBet, betAmount),
    currentPlayer: nextPlayerIndex,
  };
};

export const fold = (gameContext: GameContext, playerId: number): GameContext => {
  const updatedPlayers = gameContext.players.map(player => {
    if (player.id === playerId) {
      return {
        ...player,
        isActive: false,
        isTurn: false
      };
    }
    return player;
  });

  const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;

  return {
    ...gameContext,
    players: updatedPlayers,
    currentPlayer: nextPlayerIndex,
  };
};

export const calculatePotSize = (players: Player[]): number => {
  return players.reduce((total, player) => total + (player.currentBet || 0), 0);
};

export const evaluateHand = (cards: Card[]): number => {
  // Simple hand evaluation - just sum the ranks
  const rankValues: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  return cards.reduce((total, card) => total + rankValues[card.rank], 0);
};