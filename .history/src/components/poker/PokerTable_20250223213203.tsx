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
import { BotLogic } from './BotLogic';

interface PokerTableProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const PokerTable: React.FC<PokerTableProps> = ({ roomId, onLeaveRoom }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { gameContext, updateGameState } = useGameState(roomId);
  const { handleBet, handleFold, handleCall, handleCheck, handleRaise, isValidAction } = useBettingHandler(gameContext, updateGameState);
  const { startNewHand, dealCommunityCards } = useGameLogic(gameContext, updateGameState);

  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(0);
  const [showBetSlider, setShowBetSlider] = useState<boolean>(false);

  const currentPlayer = useMemo(() => {
    return gameContext.players.find(p => p.isTurn);
  }, [gameContext.players]);

  const potSize = useMemo(() => {
    return calculatePotSize(gameContext.players);
  }, [gameContext.players]);

  // Show bet slider when it's current player's turn and they haven't acted
  useEffect(() => {
    if (!currentPlayer) return;
    
    const shouldShowSlider = currentPlayer.isTurn && !currentPlayer.hasActed;
    setShowBetSlider(shouldShowSlider);
  }, [currentPlayer]);

  const handleBetSubmit = useCallback(async () => {
    if (!currentPlayer) return;
    
    try {
      await handleBet(selectedBetAmount);
      setShowBetSlider(false);
      setSelectedBetAmount(0);
    } catch (error) {
      console.error('Error handling bet:', error);
    }
  }, [currentPlayer, selectedBetAmount, handleBet]);

  const handleBetAmountChange = useCallback((amount: number) => {
    setSelectedBetAmount(amount);
  }, []);

  const handleTimeout = useCallback(() => {
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
      toast.warning("Your turn is about to end! Please make a decision.", {
        duration: 5000,
      });
    }
  }, [gameContext, handleBet, handleFold]);

  // Handle bot actions
  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') {
      return;
    }

    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    if (!currentPlayer?.name.startsWith('Bot') || !currentPlayer.isTurn || !currentPlayer.isActive) {
      return;
    }

    const timer = setTimeout(() => {
      handleOpponentAction(
        currentPlayer,
        gameContext,
        handleBet,
        handleFold
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [gameContext.currentPlayer, gameContext.gameId, gameContext.gameState, handleBet, handleFold]);

  // Handle community card dealing
  useEffect(() => {
    if (!gameContext.gameId || gameContext.gameState !== 'betting') {
      return;
    }

    const activePlayers = gameContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => 
      !p.isActive || p.currentBet === gameContext.currentBet || p.hasFolded
    );

    if (!allPlayersActed || activePlayers.length <= 1) {
      return;
    }

    const timer = setTimeout(() => {
      dealCommunityCards().catch(error => {
        console.error('Error dealing community cards:', error);
        toast.error('Failed to deal community cards');
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameContext.gameId, gameContext.gameState, gameContext.players, gameContext.currentBet, dealCommunityCards]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213E] p-2 sm:p-3 md:p-4 overflow-hidden">
      <div className="flex justify-between items-center absolute top-4 left-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onLeaveRoom()}
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

      <div className="absolute inset-0 flex items-center justify-center">
        <CommunityCards cards={gameContext.communityCards} />
        
        <div className="absolute top-1/2 transform -translate-y-1/2 bg-black/50 text-white px-4 py-2 rounded">
          Pot: ${potSize}
        </div>
      </div>

      <div className="relative w-full h-full">
        <BotLogic gameContext={gameContext} updateGameState={updateGameState} />
        {gameContext.players.map((player, index) => (
          <PlayerComponent
            key={`${player.position}-${index}`}
            player={player}
            position={player.position}
            isCurrentPlayer={player.isTurn}
          />
        ))}
      </div>

      <ActionButtons
        gameState={gameContext.gameState}
        currentPlayer={currentPlayer}
        showBetSlider={showBetSlider}
        selectedBetAmount={selectedBetAmount}
        onBetAmountChange={handleBetAmountChange}
        onBetSubmit={handleBetSubmit}
        onCall={handleCall}
        onFold={handleFold}
        onCheck={handleCheck}
        onRaise={handleRaise}
        isValidAction={isValidAction}
      />
    </div>
  );
};

export default PokerTable; 