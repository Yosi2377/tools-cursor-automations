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

  const handleBotAction = (currentPlayer: any) => {
    console.log('Bot action for:', currentPlayer.name);
    const amountToCall = gameContext.currentBet - currentPlayer.currentBet;
    
    // Bot decision making based on Texas Hold'em strategy
    const hasGoodHand = currentPlayer.cards.some(card => 
      ['A', 'K', 'Q', 'J', '10'].includes(card.rank)
    );
    const hasPair = currentPlayer.cards[0].rank === currentPlayer.cards[1].rank;
    const isPreFlop = gameContext.communityCards.length === 0;
    const potOdds = amountToCall / (gameContext.pot + amountToCall);
    
    // More aggressive pre-flop play
    if (isPreFlop && (hasGoodHand || hasPair || Math.random() < 0.7)) {
      const raiseAmount = Math.min(
        currentPlayer.chips,
        amountToCall + gameContext.minimumBet * (1 + Math.floor(Math.random() * 3))
      );
      handleBet(raiseAmount);
    } else if (currentPlayer.chips >= amountToCall && (hasGoodHand || Math.random() < 0.4)) {
      handleBet(amountToCall); // Call
    } else {
      handleFold();
    }
  };

  // Handle bot turns immediately
  useEffect(() => {
    if (!gameContext.gameId) return;

    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (currentPlayer?.name.startsWith('Bot') && currentPlayer.isTurn) {
      // Small delay for visual feedback
      const timer = setTimeout(() => {
        handleBotAction(currentPlayer);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.players]);

  // Check for dealing community cards
  useEffect(() => {
    if (!gameContext.gameId) {
      console.log('No game ID in context, skipping community card check');
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === gameContext.currentBet);
    
    console.log('Checking community cards:', {
      activePlayers: activePlayers.length,
      allPlayersActed,
      currentCommunityCards: gameContext.communityCards.length,
      playerBets: activePlayers.map(p => ({ name: p.name, bet: p.currentBet })),
      currentBet: gameContext.currentBet,
      gameId: gameContext.gameId
    });

    if (allPlayersActed && activePlayers.length > 1) {
      // Reset bets before dealing next cards
      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, currentBet: 0 })),
        currentBet: 0,
        currentPlayer: (prev.dealerPosition + 1) % prev.players.length
      }));

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
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      <div className="flex justify-between items-center absolute top-4 left-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onLeaveRoom}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
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
        onTimeout={handleBotAction}
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