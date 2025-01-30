import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Key, Coins } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const UserList = () => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  // Fetch users and their balances
  const { data: users, isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('No active session');

        // Fetch users from Edge Function
        const { data: usersData, error } = await supabase.functions.invoke('manage-users', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        
        if (error) throw error;
        if (!usersData?.users) throw new Error('Invalid response format');

        // Fetch balances for all users
        const { data: balances, error: balancesError } = await supabase
          .from('game_players')
          .select('user_id, chips')
          .is('game_id', null);

        if (balancesError) throw balancesError;

        // Combine user data with balances
        const usersWithBalances = usersData.users.map((user: any) => ({
          ...user,
          balance: balances?.find((b: any) => b.user_id === user.id)?.chips || 0
        }));

        return usersWithBalances;
      } catch (error: any) {
        console.error('Error in queryFn:', error);
        throw new Error(error.message || 'Failed to fetch users');
      }
    },
    retry: 1,
  });

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const { error } = await supabase.functions.invoke('manage-users', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { userId }
      });

      if (error) throw error;

      toast.success('User deleted successfully');
      refetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUserId || !newPassword) return;

    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const { error } = await supabase.functions.invoke('manage-users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { 
          userId: selectedUserId,
          password: newPassword,
          action: 'update_password'
        }
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUserId || !newBalance) return;

    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const { error } = await supabase.from('game_players')
        .update({ chips: parseInt(newBalance), default_chips: parseInt(newBalance) })
        .eq('user_id', selectedUserId);

      if (error) throw error;

      toast.success('Balance updated successfully');
      setNewBalance('');
      setIsBalanceDialogOpen(false);
      refetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update balance');
      console.error('Error updating balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (usersError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription className="text-red-500">
            Error loading users: {usersError instanceof Error ? usersError.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Users</CardTitle>
        <CardDescription>
          View and manage existing user accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users && users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
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
                        onClick={() => setSelectedUserId(user.id)}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Key className="h-4 w-4" />
                        Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter a new password for {user.user_metadata?.username || user.email}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Button 
                          onClick={handlePasswordChange}
                          disabled={!newPassword || loading}
                        >
                          Update Password
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBalanceDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                    setIsBalanceDialogOpen(open);
                    if (!open) setSelectedUserId(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Coins className="h-4 w-4" />
                        Balance
                      </Button>
                    </DialogTrigger>
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
                          onClick={handleBalanceUpdate}
                          disabled={!newBalance || loading}
                        >
                          Update Balance
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No users found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserList;