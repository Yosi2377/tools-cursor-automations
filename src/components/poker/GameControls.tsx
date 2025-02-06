import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { GameContext } from '@/types/poker';
import { CircleDollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

interface GameControlsProps {
  gameContext: GameContext;
  onStartHand: () => void;
  onBet: (amount: number) => void;
  onFold: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameContext,
  onStartHand,
  onBet,
  onFold,
}) => {
  const [customBetAmount, setCustomBetAmount] = useState<number>(0);
  const currentPlayer = gameContext.players[gameContext.currentPlayer];
  const isPlayerTurn = currentPlayer?.position === 'bottom' && currentPlayer?.isTurn;
  const bottomPlayer = gameContext.players.find(p => p.position === 'bottom');

  if (gameContext.gameState === "waiting") {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button 
          onClick={onStartHand}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
        >
          <CircleDollarSign className="w-6 h-6 mr-2" />
          Start New Hand
        </Button>
      </div>
    );
  }

  if (gameContext.gameState === "betting" && bottomPlayer) {
    const amountToCall = gameContext.currentBet - (bottomPlayer?.currentBet || 0);
    const minRaise = gameContext.currentBet * 2;
    const canCall = bottomPlayer.chips >= amountToCall;
    const canRaise = bottomPlayer.chips >= minRaise;

    const handleSliderChange = (value: number[]) => {
      setCustomBetAmount(value[0]);
    };

    const adjustBetAmount = (increment: boolean) => {
      const step = gameContext.minimumBet;
      const newAmount = increment 
        ? Math.min(customBetAmount + step, bottomPlayer.chips)
        : Math.max(customBetAmount - step, gameContext.minimumBet);
      setCustomBetAmount(newAmount);
    };

    const handleCustomBet = () => {
      if (customBetAmount <= 0 || customBetAmount > bottomPlayer.chips) return;
      onBet(customBetAmount);
      setCustomBetAmount(0);
    };

    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <Button 
            variant="destructive" 
            onClick={onFold}
            disabled={!isPlayerTurn}
            className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fold
          </Button>
          
          {canCall && amountToCall > 0 && (
            <Button 
              variant="outline" 
              onClick={() => onBet(amountToCall)}
              disabled={!isPlayerTurn}
              className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white border-none px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CircleDollarSign className="w-5 h-5 mr-2" />
              Call ${amountToCall}
            </Button>
          )}

          {canRaise && (
            <Button 
              onClick={() => onBet(minRaise)}
              disabled={!isPlayerTurn}
              className="bg-[#6E59A5] hover:bg-[#9b87f5] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CircleDollarSign className="w-5 h-5 mr-2" />
              Raise to ${minRaise}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 w-full max-w-md bg-black/40 p-4 rounded-xl">
          <Button
            onClick={() => adjustBetAmount(false)}
            disabled={!isPlayerTurn || customBetAmount <= gameContext.minimumBet}
            size="icon"
            variant="outline"
            className="text-white border-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 px-4">
            <Slider
              value={[customBetAmount]}
              min={gameContext.minimumBet}
              max={bottomPlayer.chips}
              step={gameContext.minimumBet}
              onValueChange={handleSliderChange}
              disabled={!isPlayerTurn}
              className="[&_[role=slider]]:bg-[#9b87f5] [&_[role=slider]]:border-white/20"
            />
          </div>
          
          <Button
            onClick={() => adjustBetAmount(true)}
            disabled={!isPlayerTurn || customBetAmount >= bottomPlayer.chips}
            size="icon"
            variant="outline"
            className="text-white border-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleCustomBet}
            disabled={!isPlayerTurn || customBetAmount <= 0}
            className="bg-[#6E59A5] hover:bg-[#9b87f5] text-white px-4 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
          >
            <CircleDollarSign className="w-4 h-4 mr-2" />
            Bet ${customBetAmount}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default GameControls;