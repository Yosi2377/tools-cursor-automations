import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CreateUserFormProps {
  onUserCreated: () => void;
}

const CreateUserForm = ({ onUserCreated }: CreateUserFormProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [initialChips, setInitialChips] = useState('1000');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !initialChips) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate username length
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Generate email from username
      const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedUsername}@poker-game.com`;

      // Create the user in Supabase Auth
      const { data: userData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: sanitizedUsername
          }
        }
      });

      if (signUpError) {
        toast.error(signUpError.message);
        return;
      }

      if (!userData.user) {
        toast.error('Failed to create user');
        return;
      }

      // Create game player record with initial chips
      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          user_id: userData.user.id,
          chips: parseInt(initialChips),
          default_chips: parseInt(initialChips)
        });

      if (playerError) {
        toast.error('Failed to set initial chips');
        return;
      }

      toast.success('User created successfully!');
      setUsername('');
      setPassword('');
      setInitialChips('1000');
      onUserCreated();
      
    } catch (error: any) {
      toast.error('Failed to create user');
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>
          Create a new user account and set their initial chip balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <Input
              placeholder="Username (min. 3 characters)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Input
              type="number"
              placeholder="Initial Chips"
              value={initialChips}
              onChange={(e) => setInitialChips(e.target.value)}
              disabled={loading}
              min="0"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateUserForm;