import { useIsMobile } from '@/hooks/use-mobile';
import { GameContext } from '@/types/poker';
import TableFelt from './TableFelt';
import PotDisplay from './PotDisplay';
import CommunityCards from './CommunityCards';
import PlayerSpot from '../PlayerSpot';

interface TableLayoutProps {
  gameContext: GameContext;
  onTimeout: () => void;
}

const TableLayout: React.FC<TableLayoutProps> = ({ gameContext, onTimeout }) => {
  const isMobile = useIsMobile();

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#1a1a1a] rounded-xl overflow-hidden">
      <TableFelt />
      
      {/* Pot and community cards */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <PotDisplay amount={gameContext.pot} rake={gameContext.rake} />
        <div className="mt-4">
          <CommunityCards cards={gameContext.communityCards} />
        </div>
      </div>
      
      {/* Player positions */}
      <div className="absolute inset-0">
        {gameContext.players.map((player) => (
          <PlayerSpot 
            key={player.id} 
            player={player} 
            onTimeout={player.isTurn ? onTimeout : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default TableLayout;