import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Player, Card, GameState } from '@/types/poker';
import { useGameState } from './GameStateManager';
import { useBettingHandler } from './BettingHandler';
import { useGameLogic } from './GameLogic';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { calculatePotSize } from '@/utils/pokerLogic';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import LeaderBoard from './LeaderBoard';
import TableLayout from './TableLayout';
import GameControls from './GameControls';
import { handleOpponentAction } from '@/utils/opponentActions';
import { toast } from 'sonner';
import PlayerComponent from './PlayerComponent';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';

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
    // Implement timeout logic here
  };

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
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.gameState, gameContext.players, handleBet, handleFold, gameContext]);

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
  }, [gameContext.players, gameContext.currentBet, gameContext.communityCards, gameContext.gameId, gameContext.gameState, dealNextCommunityCards, gameContext]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213E] p-2 sm:p-3 md:p-4 overflow-hidden">
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