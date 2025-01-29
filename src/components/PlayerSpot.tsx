import React from 'react';
import { Player } from '@/types/poker';
import { Avatar, AvatarFallback } from './ui/avatar';
import TurnTimer from './poker/TurnTimer';

interface PlayerSpotProps {
  player: Player;
  onTimeout?: () => void;
}

const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, onTimeout }) => {
  const getPositionClasses = () => {
    switch (player.position) {
      case 'bottom':
        return 'bottom-0 left-1/2 -translate-x-1/2 transform';
      case 'left':
        return 'left-0 top-1/2 -translate-y-1/2 transform';
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 transform';
      case 'right':
        return 'right-0 top-1/2 -translate-y-1/2 transform';
      default:
        return '';
    }
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return ['hearts', 'diamonds'].includes(suit.toLowerCase()) ? 'text-red-500' : 'text-gray-900';
  };

  return (
    <div className={`absolute ${getPositionClasses()} flex flex-col items-center gap-2`}>
      <div className={`relative p-4 rounded-lg ${
        player.isTurn ? 'bg-poker-accent/20 animate-pulse' : 'bg-black/20'
      }`}>
        {player.isDealer && (
          <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold border-2 border-poker-accent shadow-lg">
            D
          </div>
        )}
        
        <Avatar className="w-16 h-16 border-2 border-poker-accent">
          <AvatarFallback className="bg-poker-background text-poker-accent">
            {player.name[0]}
          </AvatarFallback>
        </Avatar>
        
        {player.isTurn && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <TurnTimer 
              isActive={player.isTurn} 
              onTimeout={onTimeout}
            />
          </div>
        )}

        <div className="mt-2 text-center">
          <p className="text-poker-accent font-semibold">{player.name}</p>
          <p className="text-sm text-poker-accent/80">${player.chips}</p>
          {player.currentBet > 0 && (
            <p className="text-xs text-poker-accent/60">Bet: ${player.currentBet}</p>
          )}
        </div>

        {player.cards.length > 0 && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-2 flex gap-1">
            {player.cards.map((card, index) => (
              <div
                key={index}
                className={`w-10 h-14 rounded-md shadow-lg flex flex-col items-center justify-between p-1 animate-card-deal ${
                  card.faceUp
                    ? 'bg-white'
                    : 'bg-poker-accent/20 border border-poker-accent/40'
                }`}
                style={{
                  animationDelay: `${index * 0.2}s`,
                  backgroundImage: card.faceUp ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'none'
                }}
              >
                {card.faceUp ? (
                  <>
                    <div className={`text-sm font-bold ${getSuitColor(card.suit)} self-start`}>
                      {card.rank}
                    </div>
                    <div className={`text-lg ${getSuitColor(card.suit)}`}>
                      {getSuitSymbol(card.suit)}
                    </div>
                    <div className={`text-sm font-bold ${getSuitColor(card.suit)} self-end transform rotate-180`}>
                      {card.rank}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full rounded-md bg-gradient-to-br from-poker-accent/30 to-poker-accent/10" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSpot;