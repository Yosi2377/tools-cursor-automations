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
    <div className={`absolute ${isMobile ? 'inset-4' : 'inset-16'} bg-transparent`}>
      <TableFelt />
      <PotDisplay amount={gameContext.pot} rake={gameContext.rake} />
      <CommunityCards cards={gameContext.communityCards} />
      
      {gameContext.players.map((player) => (
        <PlayerSpot 
          key={player.id} 
          player={player} 
          onTimeout={player.isTurn ? onTimeout : undefined}
        />
      ))}
    </div>
  );
};

export default TableLayout;