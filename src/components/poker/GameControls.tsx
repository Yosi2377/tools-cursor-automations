import React from 'react';
import { Button } from '@/components/ui/button';
import { GameContext } from '@/types/poker';

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
          className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Start New Hand
        </Button>
      </div>
    );
  }

  if (gameContext.gameState === "betting" && isPlayerTurn) {
    const canCall = currentPlayer.chips >= gameContext.currentBet;
    const canRaise = currentPlayer.chips >= gameContext.currentBet * 2;

    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button 
          variant="destructive" 
          onClick={onFold}
          className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Fold
        </Button>
        {canCall && (
          <Button 
            variant="outline" 
            onClick={() => onBet(gameContext.currentBet)}
            className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Call ${gameContext.currentBet}
          </Button>
        )}
        {canRaise && (
          <Button 
            onClick={() => onBet(gameContext.currentBet * 2)}
            className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Raise to ${gameContext.currentBet * 2}
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default GameControls;