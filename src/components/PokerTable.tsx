import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, LogOut } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';
import TableLayout from './poker/TableLayout';
import { useGameState } from './poker/GameStateManager';
import { useBettingHandler } from './poker/BettingHandler';
import { useGameLogic } from './poker/GameLogic';
import GameControls from './poker/GameControls';

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
      if (currentPlayer.chips >= gameContext.minimumBet) {
        handleBet(gameContext.minimumBet);
      } else {
        handleFold();
      }
    }
  };

  useEffect(() => {
    if (!gameContext.gameId) return;

    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (currentPlayer?.name.startsWith('Bot') && currentPlayer.isTurn) {
      const timer = setTimeout(() => {
        if (currentPlayer.chips >= gameContext.minimumBet) {
          handleBet(gameContext.minimumBet);
        } else {
          handleFold();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.players]);

  useEffect(() => {
    if (!gameContext.gameId) {
      console.log('No game ID in context, skipping community card check');
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === gameContext.currentBet);
    
    if (allPlayersActed && activePlayers.length > 1) {
      const currentCommunityCards = gameContext.communityCards.length;
      if (currentCommunityCards < 5) {
        const timer = setTimeout(() => {
          dealNextCommunityCards();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameContext.players, gameContext.currentBet, gameContext.communityCards, gameContext.gameId]);

  return (
    <div className="relative w-full h-screen bg-[#1a1a1a] p-4 overflow-hidden">
      <div className="flex justify-between items-center absolute top-4 left-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onLeaveRoom}
          className="flex items-center gap-2 bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          <Menu className="w-4 h-4" />
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