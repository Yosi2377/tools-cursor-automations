
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

interface RakeEntry {
  id: string;
  game_id: string;
  amount: number;
  total_pot: number;
  created_at: string;
}

const RakeHistory = () => {
  const { data: rakeHistory, isLoading, error } = useQuery({
    queryKey: ['rakeHistory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rake_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching rake history:', error);
        toast.error('Failed to load rake history. Please try again.');
        throw error;
      }
      return data as RakeEntry[];
    },
    retry: 1
  });

  const totalRake = rakeHistory?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading rake history. Please try again later.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Loading rake history...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Rake History</h2>
      <div className="mb-4">
        <p className="text-lg">Total Rake Collected: ${totalRake}</p>
      </div>
      <Table>
        <TableCaption>A list of all rake collections from games</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Game ID</TableHead>
            <TableHead>Rake Amount</TableHead>
            <TableHead>Total Pot</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rakeHistory?.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.game_id}</TableCell>
              <TableCell>${entry.amount}</TableCell>
              <TableCell>${entry.total_pot}</TableCell>
              <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RakeHistory;
