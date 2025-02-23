import React, { useEffect } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { toast } from 'react-hot-toast';

const PokerTable: React.FC = () => {
  const gameContext = useGameContext();

  useEffect(() => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (currentPlayer?.name.startsWith('Bot') && currentPlayer.isTurn && currentPlayer.isActive) {
      console.log('Bot turn detected:', currentPlayer.name);
      const timer = setTimeout(() => {
        handleOpponentAction(
          currentPlayer,
          gameContext,
          handleBet,
          handleFold
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.gameState, gameContext.players, handleBet, handleFold]);

  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') {
      console.log('No game ID in context or not in betting state, skipping community card check');
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p =>
      !p.isActive || p.currentBet === gameContext.currentBet
    );

    console.log('Checking community cards:', {
      activePlayers: activePlayers.length,
      allPlayersActed,
      currentCommunityCards: gameContext.communityCards.length,
      playerBets: activePlayers.map(p => ({
        name: p.name,
        bet: p.currentBet,
        isActive: p.isActive,
        isTurn: p.isTurn
      })),
      currentBet: gameContext.currentBet,
      gameState: gameContext.gameState
    });

    if (allPlayersActed && activePlayers.filter(p => p.isActive).length > 1) {
      console.log('All players have acted, dealing next community cards');
      const timer = setTimeout(() => {
        dealNextCommunityCards().catch(error => {
          console.error('Error dealing community cards:', error);
          toast.error('Failed to deal community cards');
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameContext.players, gameContext.currentBet, gameContext.communityCards, gameContext.gameId, gameContext.gameState, dealNextCommunityCards]);

  return (
    <div>PokerTable component content</div>
  );
};

export default PokerTable; 