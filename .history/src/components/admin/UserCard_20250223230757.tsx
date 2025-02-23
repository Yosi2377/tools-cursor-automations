import { Button } from "@/components/ui/button";
import { Trash2, Key, Coins } from 'lucide-react';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import PasswordDialog from './dialogs/PasswordDialog';
import BalanceDialog from './dialogs/BalanceDialog';
import { useState } from 'react';

interface UserCardProps {
  user: any;
  onDelete: (userId: string) => Promise<void>;
  onPasswordChange: (userId: string, newPassword: string) => Promise<void>;
  onBalanceUpdate: (userId: string, newBalance: string) => Promise<void>;
  loading: boolean;
}

const UserCard = ({ user, onDelete, onPasswordChange, onBalanceUpdate, loading }: UserCardProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium">{user.user_metadata?.username || user.email}</p>
        <p className="text-sm text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</p>
        <p className="text-sm text-emerald-600">Balance: ${user.balance}</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog open={isPasswordDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) setSelectedUserId(null);
        }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedUserId(user.id);
                setIsPasswordDialogOpen(true);
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Password
            </Button>
          </DialogTrigger>
          <PasswordDialog
            user={user}
            onPasswordChange={(newPassword) => onPasswordChange(user.id, newPassword)}
            loading={loading}
          />
        </Dialog>

        <Dialog open={isBalanceDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
          setIsBalanceDialogOpen(open);
          if (!open) setSelectedUserId(null);
        }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedUserId(user.id);
                setIsBalanceDialogOpen(true);
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Coins className="h-4 w-4" />
              Balance
            </Button>
          </DialogTrigger>
          <BalanceDialog
            user={user}
            onBalanceUpdate={(newBalance) => onBalanceUpdate(user.id, newBalance)}
            loading={loading}
          />
        </Dialog>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(user.id)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default UserCard;