import { GameContext } from '../types/poker';

export const initialGameState: GameContext = {
    players: [],
    pot: 0,
    rake: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
    dealerPosition: 0,
    isInitialized: false
}; 