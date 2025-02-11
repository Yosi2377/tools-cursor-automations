import { Room } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Users, Bot, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RoomCardProps {
  room: Room;
  isAdmin: boolean;
  onJoinRoom: (roomId: string) => void;
  refetchRooms: () => void;
}

const RoomCard = ({ room, isAdmin, onJoinRoom, refetchRooms }: RoomCardProps) => {
  const deleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      toast.success('Room deleted successfully');
      refetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
    }
  };

  return (
    <div className="p-2 border rounded-lg shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{room.actual_players}</span>
          </div>
          {room.with_bots && (
            <Bot className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Min bet: ${room.min_bet}</span>
        <div className="flex gap-2">
          <Button onClick={() => onJoinRoom(room.id)}>Join</Button>
          {isAdmin && (
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => deleteRoom(room.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
