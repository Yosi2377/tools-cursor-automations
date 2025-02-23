import React from 'react';
import { Player, GameState } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ActionButtonsProps {
  gameState: GameState;
  currentPlayer: Player | undefined;
  showBetSlider: boolean;
  selectedBetAmount: number;
  onBetAmountChange: (amount: number) => void;
  onBetSubmit: () => void;
  onCall: () => void;
  onFold: () => void;
  onCheck: () => void;
  onRaise: () => void;
  isValidAction: (action: string) => boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  gameState,
  currentPlayer,
  showBetSlider,
  selectedBetAmount,
  onBetAmountChange,
  onBetSubmit,
  onCall,
  onFold,
  onCheck,
  onRaise,
  isValidAction
}) => {
  if (!currentPlayer || gameState !== 'betting') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 bg-black/50 p-4 rounded-lg">
      {showBetSlider && (
        <div className="w-64 flex flex-col gap-2">
          <Slider
            value={[selectedBetAmount]}
            onValueChange={([value]) => onBetAmountChange(value)}
            min={currentPlayer.currentBet}
            max={currentPlayer.chips}
            step={1}
          />
          <div className="text-white text-center">
            Bet Amount: ${selectedBetAmount}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        {isValidAction('check') && (
          <Button
            variant="outline"
            onClick={onCheck}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Check
          </Button>
        )}
        
        {isValidAction('call') && (
          <Button
            variant="outline"
            onClick={onCall}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Call
          </Button>
        )}
        
        {isValidAction('raise') && (
          <Button
            variant="outline"
            onClick={onRaise}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Raise
          </Button>
        )}
        
        {showBetSlider && (
          <Button
            variant="outline"
            onClick={onBetSubmit}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Bet
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={onFold}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Fold
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons; 