import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';

const UserList = () => {
  const [loading, setLoading] = useState(false);

  // Fetch users using Supabase Functions client
  const { data: users, isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('No active session');

        console.log('Fetching users with session token...'); // Debug log

        const { data, error } = await supabase.functions.invoke('manage-users', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        
        if (error) {
          console.error('Error from Edge Function:', error);
          throw error;
        }

        if (!data?.users) {
          throw new Error('Invalid response format');
        }

        console.log('Fetched users:', data.users); // Debug log
        return data.users;
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
                </div>
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