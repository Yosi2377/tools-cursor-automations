import React, { useState } from 'react';
import { GameContext } from '../types/poker';
import GameControls from './poker/GameControls';
import { Button } from './ui/button';
import { Menu, LogOut } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';
import { useGameLogic } from './poker/GameLogic';
import { useBettingLogic } from './poker/BettingLogic';
import { useCardDealing } from './poker/CardDealing';
import TableLayout from './poker/TableLayout';
import TableInitializer from './poker/TableInitializer';
import GameSubscriptions from './poker/GameSubscriptions';

interface PokerTableProps {
  roomId: string;
  onLeaveRoom: () => void;
}

const PokerTable: React.FC<PokerTableProps> = ({ roomId, onLeaveRoom }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [withBots, setWithBots] = useState(true);
  
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [],
    pot: 0,
    rake: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
    dealerPosition: 0,
  });

  const { dealCommunityCards } = useCardDealing();
  const { startNewHand } = useGameLogic(gameContext, setGameContext);
  const { handleBet, handleFold, handleTimeout } = useBettingLogic(
    gameContext,
    setGameContext,
    (count: number) => {
      const cards = dealCommunityCards(count);
      return cards;
    }
  );

  return (
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      <TableInitializer 
        roomId={roomId}
        setGameContext={setGameContext}
        setWithBots={setWithBots}
      />
      
      <GameSubscriptions setGameContext={setGameContext} />

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