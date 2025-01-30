import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import GameHistory from './GameHistory';
import RoomCard from './RoomCard';
import CreateRoomForm from './CreateRoomForm';
import { Room } from '@/types/poker';

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
}

const RoomList = ({ onJoinRoom, isCreating, setIsCreating }: RoomListProps) => {
  const { data: rooms, isLoading, error, refetch } = useQuery({
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

  const joinRoom = async (roomId: string) => {
    try {
      console.log('Attempting to join room:', roomId);
      const { error } = await supabase
        .from('games')
        .insert([{ room_id: roomId }]);

      if (error) throw error;

      onJoinRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
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
        <CreateRoomForm
          onCancel={() => setIsCreating(false)}
          onSuccess={() => {
            setIsCreating(false);
            refetch();
          }}
        />
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
            <RoomCard
              key={room.id}
              room={room}
              isAdmin={isAdmin || false}
              onJoinRoom={joinRoom}
              refetchRooms={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;