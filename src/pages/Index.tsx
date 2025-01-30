import PokerTable from "@/components/PokerTable";
import RoomList from "@/components/poker/RoomList";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
      return data as boolean;
    }
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
      console.error("Logout error:", error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    console.log('Joining room:', roomId);
    setSelectedRoom(roomId);
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
        {isAdmin && (
          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Room
          </Button>
        )}
      </div>
      
      {selectedRoom ? (
        <PokerTable roomId={selectedRoom} onLeaveRoom={() => setSelectedRoom(null)} />
      ) : (
        <RoomList 
          onJoinRoom={handleJoinRoom} 
          isCreating={isCreating}
          setIsCreating={setIsCreating}
        />
      )}
    </div>
  );
};

export default Index;