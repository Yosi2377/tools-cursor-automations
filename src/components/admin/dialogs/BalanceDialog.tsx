import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from 'react';

interface BalanceDialogProps {
  user: any;
  onBalanceUpdate: (newBalance: string) => Promise<void>;
  loading: boolean;
}

const BalanceDialog = ({ user, onBalanceUpdate, loading }: BalanceDialogProps) => {
  const [newBalance, setNewBalance] = useState('');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update Balance</DialogTitle>
        <DialogDescription>
          Set new balance for {user.user_metadata?.username || user.email}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-4">
        <Input
          type="number"
          placeholder="New balance"
          value={newBalance}
          onChange={(e) => setNewBalance(e.target.value)}
          min="0"
        />
        <Button 
          onClick={() => onBalanceUpdate(newBalance)}
          disabled={!newBalance || loading}
        >
          Update Balance
        </Button>
      </div>
    </DialogContent>
  );
};

export default BalanceDialog;