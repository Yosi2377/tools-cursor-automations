import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

interface GameHistoryEntry {
  id: string;
  room_id: string;
  winner_id: string;
  final_pot: number;
  created_at: string;
  players: any[];
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
      return data as GameHistoryEntry[];
    }
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