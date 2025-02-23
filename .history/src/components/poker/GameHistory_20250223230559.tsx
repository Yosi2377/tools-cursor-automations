import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types/poker';

interface GameHistoryEntry {
  id: string;
  room_id: string;
  winner_id: string;
  final_pot: number;
  created_at: string;
  players: Player[];
}

const GameHistory = () => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['gameHistory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Parse the players JSON data into Player objects
      return (data as unknown[]).map(entry => ({
        id: (entry as any).id,
        room_id: (entry as any).room_id,
        winner_id: (entry as any).winner_id,
        final_pot: (entry as any).final_pot,
        created_at: (entry as any).created_at,
        players: Array.isArray((entry as any).players) 
          ? ((entry as any).players as any[]).map(player => ({
              id: player.id || '',
              name: player.name || '',
              position: player.position || '',
              chips: player.chips || 0,
              cards: player.cards || [],
              isActive: player.is_active || false,
              isTurn: player.is_turn || false,
              currentBet: player.current_bet || 0,
              lastAction: player.last_action,
              score: player.score || 0,
              isVisible: player.is_visible ?? true,
              hasActed: player.has_acted || false,
              stack: player.stack || 0,
              hasFolded: player.has_folded || false
            }))
          : []
      })) as GameHistoryEntry[];
    },
    retry: 3,
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Game History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <p>Loading history...</p>
          ) : history?.length === 0 ? (
            <p className="text-muted-foreground">No games played yet.</p>
          ) : (
            history?.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Final Pot: ${entry.final_pot}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Players: {entry.players.length}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GameHistory;