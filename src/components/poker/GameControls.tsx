
import React from 'react';
import { Button } from '@/components/ui/button';
import { GameContext } from '@/types/poker';
import { Chip } from 'lucide-react';

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
  const currentPlayer = gameContext.players[gameContext.currentPlayer];
  const isPlayerTurn = currentPlayer?.position === 'bottom' && currentPlayer?.isTurn;

  if (gameContext.gameState === "waiting") {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button 
          onClick={onStartHand}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
        >
          <Chip className="w-6 h-6 mr-2" />
          Start New Hand
        </Button>
      </div>
    );
  }

  if (gameContext.gameState === "betting" && isPlayerTurn) {
    const canCall = currentPlayer.chips >= (gameContext.currentBet - currentPlayer.currentBet);
    const minRaise = gameContext.currentBet * 2;
    const canRaise = currentPlayer.chips >= minRaise;
    const amountToCall = gameContext.currentBet - currentPlayer.currentBet;

    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button 
          variant="destructive" 
          onClick={onFold}
          className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl bg-red-600 hover:bg-red-700"
        >
          Fold
        </Button>
        
        {canCall && amountToCall > 0 && (
          <Button 
            variant="outline" 
            onClick={() => onBet(amountToCall)}
            className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white border-none px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
          >
            <Chip className="w-5 h-5 mr-2" />
            Call ${amountToCall}
          </Button>
        )}

        {canRaise && (
          <Button 
            onClick={() => onBet(minRaise)}
            className="bg-[#6E59A5] hover:bg-[#9b87f5] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
          >
            <Chip className="w-5 h-5 mr-2" />
            Raise to ${minRaise}
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default GameControls;
