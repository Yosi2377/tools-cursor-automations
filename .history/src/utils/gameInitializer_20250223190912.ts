import { GameContext, GameState } from '@/types/poker';

export const initialGameState: GameContext = {
    gameId: '',
    roomId: '',
    players: [],
    gameState: 'waiting' as GameState,
    currentBet: 0,
    pot: 0,
    rake: 0,
    dealerPosition: 0,
    currentPlayer: 0,
    communityCards: [],
    minimumBet: 10,
    isInitialized: false,
    lastAction: undefined
}; 