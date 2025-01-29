import React, { useState } from 'react';
import PlayerSpot from './PlayerSpot';
import { GameContext } from '../types/poker';
import GameControls from './poker/GameControls';
import CommunityCards from './poker/CommunityCards';
import PotDisplay from './poker/PotDisplay';
import TableFelt from './poker/TableFelt';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';
import { useGameLogic } from './poker/GameLogic';
import { useBettingLogic } from './poker/BettingLogic';
import { useCardDealing } from './poker/CardDealing';

const PokerTable = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [
      { id: 1, name: "You", chips: 1000, cards: [], position: "bottom", isActive: true, currentBet: 0, isTurn: false, score: 0, isDealer: true },
      { id: 2, name: "John", chips: 1500, cards: [], position: "left", isActive: true, currentBet: 0, isTurn: false, score: 120 },
      { id: 3, name: "Alice", chips: 2000, cards: [], position: "top", isActive: true, currentBet: 0, isTurn: false, score: 350 },
      { id: 4, name: "Bob", chips: 800, cards: [], position: "right", isActive: true, currentBet: 0, isTurn: false, score: 80 },
    ],
    pot: 0,
    rake: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
  });

  const { dealCommunityCards } = useCardDealing();
  const { startNewHand } = useGameLogic(gameContext, setGameContext);
  const { handleBet, handleFold, handleTimeout } = useBettingLogic(
    gameContext,
    setGameContext,
    (count) => {
      const newCards = dealCommunityCards(count);
      setGameContext(prev => ({
        ...prev,
        communityCards: [...prev.communityCards, ...newCards],
        players: prev.players.map(p => ({ ...p, currentBet: 0 })),
        currentBet: prev.minimumBet
      }));
    }
  );

  return (
    <div className="relative w-full h-screen bg-poker-background p-4 overflow-hidden">
      <Button 
        variant="outline" 
        className="absolute top-4 right-4 z-50"
        onClick={() => setShowLeaderboard(!showLeaderboard)}
      >
        <Menu className="w-6 h-6" />
      </Button>

      {showLeaderboard && (
        <LeaderBoard 
          players={gameContext.players}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <div className="absolute inset-8 bg-poker-table rounded-full border-8 border-poker-accent/20 shadow-2xl">
        <TableFelt />
        <PotDisplay amount={gameContext.pot} rake={gameContext.rake} />
        <CommunityCards cards={gameContext.communityCards} />
        
        {gameContext.players.map((player) => (
          <PlayerSpot 
            key={player.id} 
            player={player} 
            onTimeout={player.isTurn ? handleTimeout : undefined}
          />
        ))}
      </div>

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