import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateRoomFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateRoomForm = ({ onCancel, onSuccess }: CreateRoomFormProps) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('2');
  const [withBots, setWithBots] = useState(false);

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
      onSuccess();
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  return (
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
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default CreateRoomForm;