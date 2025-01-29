import React, { useState, useEffect } from 'react';
import { User, DollarSign } from 'lucide-react';
import PlayerSpot from './PlayerSpot';
import { Button } from '@/components/ui/button';
import { GameContext, Player } from '../types/poker';
import { dealCards, placeBet, fold } from '../utils/pokerLogic';
import { toast } from '@/components/ui/use-toast';

const PokerTable = () => {
  const [gameContext, setGameContext] = useState<GameContext>({
    players: [
      { id: 1, name: "Player 1", chips: 1000, cards: [], position: "bottom", isActive: true, currentBet: 0, isTurn: false },
      { id: 2, name: "Player 2", chips: 1500, cards: [], position: "left", isActive: true, currentBet: 0, isTurn: false },
      { id: 3, name: "Player 3", chips: 2000, cards: [], position: "top", isActive: true, currentBet: 0, isTurn: false },
      { id: 4, name: "Player 4", chips: 800, cards: [], position: "right", isActive: true, currentBet: 0, isTurn: false },
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

    // Check if we need to deal community cards
    const activePlayers = updatedContext.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === updatedContext.currentBet);
    
    if (allPlayersActed && activePlayers.length > 1) {
      if (updatedContext.communityCards.length === 0) {
        // Deal flop
        dealCommunityCards(3);
      } else if (updatedContext.communityCards.length === 3) {
        // Deal turn
        dealCommunityCards(1);
      } else if (updatedContext.communityCards.length === 4) {
        // Deal river
        dealCommunityCards(1);
      }
    }
  };

  const dealCommunityCards = (count: number) => {
    const newCards = Array(count).fill(null).map(() => ({
      suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)],
      rank: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)],
      faceUp: true
    }));

    setGameContext(prev => ({
      ...prev,
      communityCards: [...prev.communityCards, ...newCards],
      players: prev.players.map(p => ({ ...p, currentBet: 0 })),
      currentBet: prev.minimumBet
    }));

    toast({
      title: "Community cards dealt",
      description: `${count} new card${count > 1 ? 's' : ''} dealt to the table`,
    });
  };

  const handleFold = () => {
    const currentPlayer = gameContext.players[gameContext.currentPlayer];
    const nextPlayerIndex = (gameContext.currentPlayer + 1) % gameContext.players.length;
    
    setGameContext(prev => {
      const updatedContext = fold(prev, currentPlayer.id);
      const activePlayers = updatedContext.players.filter(p => p.isActive);

      // Check if only one player remains
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
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
      
      <div className="absolute inset-8 bg-poker-table rounded-full border-8 border-poker-accent/20 shadow-2xl">
        {/* Table felt texture */}
        <div className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
               backgroundRepeat: 'repeat'
             }} />

        {/* Center pot display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-poker-accent/30">
          <div className="flex items-center gap-2 text-poker-accent">
            <DollarSign className="w-5 h-5" />
            <span className="font-bold text-xl">{gameContext.pot}</span>
          </div>
        </div>

        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 flex gap-3">
          {gameContext.communityCards.map((card, index) => (
            <div
              key={index}
              className="w-16 h-24 bg-white rounded-lg shadow-xl animate-card-deal transform hover:scale-105 transition-transform"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
              }}
            />
          ))}
        </div>

        {/* Player spots */}
        {gameContext.players.map((player) => (
          <PlayerSpot key={player.id} player={player} />
        ))}
      </div>

      {/* Game controls */}
      {gameContext.gameState === "waiting" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Button 
            onClick={startNewHand}
            className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Start New Hand
          </Button>
        </div>
      )}

      {/* Player controls */}
      {gameContext.gameState === "betting" && gameContext.players[gameContext.currentPlayer].position === "bottom" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <Button 
            variant="destructive" 
            onClick={handleFold}
            className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Fold
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleBet(gameContext.currentBet)}
            className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Call ${gameContext.currentBet}
          </Button>
          <Button 
            onClick={() => handleBet(gameContext.currentBet * 2)}
            className="bg-poker-accent text-black hover:bg-poker-accent/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Raise to ${gameContext.currentBet * 2}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PokerTable;