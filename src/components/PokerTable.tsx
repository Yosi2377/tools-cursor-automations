import React, { useState } from 'react';
import PlayerSpot from './PlayerSpot';
import { GameContext, Card, Suit, Rank } from '../types/poker';
import { dealCards, placeBet, fold } from '../utils/pokerLogic';
import { toast } from '@/components/ui/use-toast';
import GameControls from './poker/GameControls';
import CommunityCards from './poker/CommunityCards';
import PotDisplay from './poker/PotDisplay';
import TableFelt from './poker/TableFelt';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import LeaderBoard from './poker/LeaderBoard';

const PokerTable = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [
      { id: 1, name: "You", chips: 1000, cards: [], position: "bottom", isActive: true, currentBet: 0, isTurn: false, score: 0 },
      { id: 2, name: "John", chips: 1500, cards: [], position: "left", isActive: true, currentBet: 0, isTurn: false, score: 120 },
      { id: 3, name: "Alice", chips: 2000, cards: [], position: "top", isActive: true, currentBet: 0, isTurn: false, score: 350 },
      { id: 4, name: "Bob", chips: 800, cards: [], position: "right", isActive: true, currentBet: 0, isTurn: false, score: 80 },
    ],
    pot: 0,
    communityCards: [],
    currentPlayer: 0,
    gameState: "waiting",
    minimumBet: 20,
    currentBet: 0,
  });

  const startNewHand = () => {
    const { updatedPlayers, remainingDeck } = dealCards(gameContext.players);
    setGameContext(prev => ({
      ...prev,
      players: updatedPlayers.map((p, i) => ({ ...p, isTurn: i === 0 })),
      gameState: "betting",
      currentPlayer: 0,
      communityCards: [],
      pot: 0,
      currentBet: prev.minimumBet
    }));
    toast({
      title: "New hand started",
      description: "Cards have been dealt to all players",
    });
  };

  const handleBet = (amount: number) => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    
    if (currentPlayer.chips < amount) {
      toast({
        title: "Invalid bet",
        description: "You don't have enough chips",
        variant: "destructive",
      });
      return;
    }

    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    const updatedContext = placeBet(gameContext, currentPlayer.id, amount);
    
    setGameContext(prev => ({
      ...updatedContext,
      currentPlayer: nextPlayerIndex,
      players: updatedContext.players.map((p, i) => ({
        ...p,
        isTurn: i === nextPlayerIndex && p.isActive
      }))
    }));

    toast({
      title: "Bet placed",
      description: `${currentPlayer.name} bet ${amount} chips`,
    });

    // Check if all active players have matched the current bet
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === updatedContext.currentBet);
    
    if (allPlayersActed && activePlayers.length > 1) {
      // Deal community cards based on current state
      if (updatedContext.communityCards.length === 0) {
        dealCommunityCards(3); // Deal the flop
      } else if (updatedContext.communityCards.length === 3) {
        dealCommunityCards(1); // Deal the turn
      } else if (updatedContext.communityCards.length === 4) {
        dealCommunityCards(1); // Deal the river
      }

      // Reset player bets for the next betting round
      setGameContext(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, currentBet: 0 })),
        currentBet: prev.minimumBet
      }));
    }
  };

  const dealCommunityCards = (count: number) => {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    const newCards: Card[] = Array(count).fill(null).map(() => ({
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      faceUp: true
    }));

    setGameContext(prev => ({
      ...prev,
      communityCards: [...prev.communityCards, ...newCards],
      players: prev.players.map(p => ({ ...p, currentBet: 0 })),
      currentBet: prev.minimumBet
    }));

    if (count === 3) {
      toast({
        title: "Flop dealt",
        description: "Three community cards have been dealt",
      });
    } else if (count === 1) {
      toast({
        title: count === 1 ? "Turn dealt" : "River dealt",
        description: `The ${count === 1 ? "fourth" : "fifth"} community card has been dealt`,
      });
    }
  };

  const handleFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    
    setGameContext(prev => {
      const updatedContext = fold(prev, currentPlayer.id);
      const activePlayers = updatedContext.players.filter(p => p.isActive);

      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        toast({
          title: "Game Over",
          description: `${winner.name} wins ${updatedContext.pot} chips!`,
        });
        
        return {
          ...updatedContext,
          gameState: "waiting",
          players: updatedContext.players.map(p => ({
            ...p,
            chips: p.id === winner.id ? p.chips + updatedContext.pot : p.chips,
            cards: [],
            currentBet: 0,
            isActive: true,
            isTurn: false
          })),
          pot: 0,
          communityCards: [],
          currentBet: 0
        };
      }

      return {
        ...updatedContext,
        currentPlayer: nextPlayerIndex,
        players: updatedContext.players.map((p, i) => ({
          ...p,
          isTurn: i === nextPlayerIndex && p.isActive
        }))
      };
    });

    toast({
      title: "Player folded",
      description: `${currentPlayer.name} has folded`,
    });
  };

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
        <PotDisplay amount={gameContext.pot} />
        <CommunityCards cards={gameContext.communityCards} />
        
        {gameContext.players.map((player) => (
          <PlayerSpot key={player.id} player={player} />
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
