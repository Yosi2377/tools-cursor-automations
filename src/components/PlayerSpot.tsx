import React from 'react';
import { User } from 'lucide-react';
import { Player, Card } from '../types/poker';

interface PlayerProps {
  player: Player;
}

const PlayerSpot: React.FC<PlayerProps> = ({ player }) => {
  const positions = {
    bottom: "bottom-8 left-1/2 -translate-x-1/2",
    left: "left-8 top-1/2 -translate-y-1/2",
    top: "top-8 left-1/2 -translate-x-1/2",
    right: "right-8 top-1/2 -translate-y-1/2",
  };

  const renderCard = (card: Card) => {
    // Only show face-up cards for the bottom player (user)
    const shouldShowCard = player.position === "bottom";
    
    if (!shouldShowCard) {
      return (
        <div
          className="w-12 h-16 bg-blue-800 rounded-lg shadow-xl transform hover:rotate-2 transition-transform"
          style={{
            backgroundImage: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
          }}
        />
      );
    }

    const suitColors = {
      hearts: "text-red-500",
      diamonds: "text-red-500",
      clubs: "text-gray-900",
      spades: "text-gray-900"
    };

    return (
      <div
        className="w-12 h-16 bg-white rounded-lg shadow-xl flex flex-col items-center justify-center transform hover:rotate-2 transition-transform"
        style={{
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
        }}
      >
        <span className={`text-sm font-bold ${suitColors[card.suit]}`}>
          {card.rank}
        </span>
        <span className={`text-lg ${suitColors[card.suit]}`}>
          {card.suit === "hearts" ? "♥" :
           card.suit === "diamonds" ? "♦" :
           card.suit === "clubs" ? "♣" : "♠"}
        </span>
      </div>
    );
  };

  return (
    <div className={`absolute ${positions[player.position]} ${player.isTurn ? 'animate-pulse' : ''}`}>
      <div className="flex flex-col items-center gap-2 transform hover:scale-105 transition-transform">
        <div className={`w-20 h-20 rounded-full ${player.isActive ? 'bg-black/40' : 'bg-red-900/40'} backdrop-blur-sm flex items-center justify-center border-2 ${player.isTurn ? 'border-yellow-400' : 'border-poker-accent'} shadow-lg`}>
          <User className="w-10 h-10 text-poker-accent" />
        </div>
        <div className="text-white text-base font-medium tracking-wide">{player.name}</div>
        <div className="text-poker-accent font-bold text-lg">${player.chips.toLocaleString()}</div>
        
        {player.currentBet > 0 && (
          <div className="text-yellow-400 text-sm">Bet: ${player.currentBet}</div>
        )}
        
        <div className="flex gap-2 -mt-1">
          {player.cards.map((card, index) => (
            <div key={index} className="animate-card-deal" style={{ animationDelay: `${index * 0.2}s` }}>
              {renderCard(card)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSpot;