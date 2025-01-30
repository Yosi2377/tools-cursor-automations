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

  // Fetch users using the Edge Function
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No session')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch users')
      }
      
      const { users } = await response.json()
      console.log('Fetched users:', users) // Debug log
      return users
    }
  });

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No session')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

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
            Error loading users: {usersError.message}
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