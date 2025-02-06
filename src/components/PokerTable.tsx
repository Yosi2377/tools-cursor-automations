import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';
import TableLayout from './poker/TableLayout';
import { useGameState } from './poker/GameStateManager';
import { useBettingHandler } from './poker/BettingHandler';
import { useGameLogic } from './poker/GameLogic';
import GameControls from './poker/GameControls';
import { handleOpponentAction } from '@/utils/opponentActions';
import { toast } from 'sonner';

interface PokerTableProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const PokerTable: React.FC<PokerTableProps> = ({ roomId, onLeaveRoom }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { gameContext, setGameContext } = useGameState(roomId);
  const { handleBet, handleFold } = useBettingHandler(gameContext, setGameContext);
  const { startNewHand, dealNextCommunityCards } = useGameLogic(gameContext, setGameContext);

  const handleTimeout = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    console.log('Timeout triggered for player:', currentPlayer.name);
    
    if (currentPlayer.name.startsWith('Bot')) {
      handleOpponentAction(
        currentPlayer,
        gameContext,
        handleBet,
        handleFold
      );
    } else {
      handleFold();
    }
  };

  // Handle bot actions with a shorter delay
  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') return;

    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (currentPlayer?.name.startsWith('Bot') && currentPlayer.isTurn) {
      console.log('Bot turn detected:', currentPlayer.name, 'Game state:', gameContext.gameState);
      const timer = setTimeout(() => {
        handleOpponentAction(
          currentPlayer,
          gameContext,
          handleBet,
          handleFold
        );
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.gameState, gameContext.players]);

  // Handle community card dealing with Texas Hold'em rules
  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') {
      console.log('No game ID in context or not in betting state, skipping community card check');
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    
    // Check if all active players have either matched the current bet or folded
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

    // Deal community cards when all players have acted and at least 2 players are active
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
  }, [gameContext.players, gameContext.currentBet, gameContext.communityCards, gameContext.gameId, gameContext.gameState]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213E] p-4 overflow-hidden">
      <div className="flex justify-between items-center absolute top-4 left-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onLeaveRoom}
          className="flex items-center gap-2 bg-black/50 text-white border-white/20 hover:bg-black/70 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-black/50 text-white border-white/20 hover:bg-black/70 transition-all duration-300 flex items-center gap-2"
        >
          <Menu className="w-4 h-4" />
          <span>Leaderboard</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {showLeaderboard && (
        <LeaderBoard 
          players={gameContext.players}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <TableLayout 
        gameContext={gameContext}
        onTimeout={handleTimeout}
      />

      <GameControls
        gameContext={gameContext}
        onStartHand={startNewHand}
        onBet={handleBet}
        onFold={handleFold}
      />
    </div>
  );
};

export default PokerTable;