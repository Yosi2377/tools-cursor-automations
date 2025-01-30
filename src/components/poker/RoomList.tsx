import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Users, Bot, BotOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import GameHistory from './GameHistory';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Room {
  id: string;
  name: string;
  max_players: number;
  min_bet: number;
  created_at: string;
  is_active: boolean;
  with_bots: boolean;
  actual_players: number;
}

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
}

const RoomList = ({ onJoinRoom }: RoomListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('2');
  const [withBots, setWithBots] = useState(false);

  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      console.log('Fetching rooms...');
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching rooms:', error);
        throw error;
      }
      console.log('Fetched rooms:', data);
      return data as Room[];
    }
  });

  const { data: isAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data, error } = await supabase
        .rpc('is_admin', { user_id: user.id });
      
      if (error) {
        console.error('Error checking admin status:', error);
        throw error;
      }
      console.log('Is admin:', data);
      return data as boolean;
    }
  });

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .insert([{ 
          name: newRoomName,
          is_active: true,
          min_bet: 20,
          max_players: 8,
          actual_players: parseInt(playerCount),
          with_bots: withBots
        }]);

      if (error) throw error;

      toast.success('Room created successfully');
      setIsCreating(false);
      setNewRoomName('');
      setPlayerCount('2');
      setWithBots(false);
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      console.log('Attempting to join room:', roomId);
      const { error } = await supabase
        .from('games')
        .insert([{ room_id: roomId }]);

      if (error) throw error;

      onJoinRoom(roomId);
      toast.success('Joined room successfully');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p>Loading rooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Error loading rooms. Please try again later.</p>
        <pre className="mt-2 text-sm">{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Poker Rooms</h2>
        <div className="flex items-center gap-2">
          <GameHistory />
          {isAdmin && (
            <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Name</label>
            <Input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Players</label>
            <Select value={playerCount} onValueChange={setPlayerCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} Players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Bots</label>
            <Switch
              checked={withBots}
              onCheckedChange={setWithBots}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={createRoom}>Create</Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {rooms && rooms.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No active rooms available.</p>
          {isAdmin && (
            <p className="mt-2">Click 'Create Room' to start a new game.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms?.map((room) => (
            <div key={room.id} className="p-4 border rounded-lg shadow">
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
                <Button onClick={() => joinRoom(room.id)}>Join</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;