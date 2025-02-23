import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import UserCard from './UserCard';
import { User } from '@/types/poker';

const UserList = () => {
  const [loading, setLoading] = useState(false);

  // Fetch users and their balances
  const { data: usersData, isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useQuery<{ users: User[] }, Error>({
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

        if (balancesError) throw balancesError as Error;

        // Combine user data with balances
        const usersWithBalances = usersData.users.map((user: User) => ({
          ...user,
          balance: balances?.find((b: { user_id: string }) => b.user_id === user.id)?.chips || 0
        }));

        return usersWithBalances;
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Failed to fetch users');
        console.error('Error in queryFn:', error);
        throw new Error((error as Error).message || 'Failed to fetch users');
      }
    },
    retry: 1,
  });

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
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
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to delete user');
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (userId: string, newPassword: string) => {
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
          userId,
          password: newPassword,
          action: 'update_password'
        }
      });

      if (error) throw error;

      toast.success('Password updated successfully');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update password');
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceUpdate = async (userId: string, newBalance: string) => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const { error } = await supabase.from('game_players')
        .update({ chips: parseInt(newBalance), default_chips: parseInt(newBalance) })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Balance updated successfully');
      refetchUsers();
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update balance');
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
          {usersData && usersData.users.length > 0 ? (
            usersData.users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onDelete={handleDeleteUser}
                onPasswordChange={handlePasswordChange}
                onBalanceUpdate={handleBalanceUpdate}
                loading={loading}
              />
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