import React from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Player, GameState } from '@/types/poker';

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
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4">
      {showBetSlider && (
        <div className="w-64 bg-black/50 p-4 rounded-lg">
          <Slider
            value={[selectedBetAmount]}
            onValueChange={([value]) => onBetAmountChange(value)}
            min={0}
            max={currentPlayer.chips}
            step={1}
          />
          <div className="text-white text-center mt-2">
            Bet Amount: ${selectedBetAmount}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        {isValidAction('check') && (
          <Button
            onClick={onCheck}
            variant="secondary"
          >
            Check
          </Button>
        )}
        
        {isValidAction('call') && (
          <Button
            onClick={onCall}
            variant="secondary"
          >
            Call
          </Button>
        )}
        
        {isValidAction('bet') && (
          <Button
            onClick={onBetSubmit}
            variant="secondary"
            disabled={selectedBetAmount <= 0}
          >
            Bet
          </Button>
        )}
        
        {isValidAction('raise') && (
          <Button
            onClick={onRaise}
            variant="secondary"
          >
            Raise
          </Button>
        )}
        
        <Button
          onClick={onFold}
          variant="destructive"
        >
          Fold
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons; 