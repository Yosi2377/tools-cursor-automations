import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateUsername = (username: string) => {
    // Only allow alphanumeric characters and underscores, 3-20 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (!username || !password) {
        toast.error('Please enter both username and password');
        return;
      }

      if (!validateUsername(username)) {
        toast.error('Username must be 3-20 characters long and can only contain letters, numbers, and underscores');
        return;
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
      // Use a more reliable email format with a real domain
      const email = `${username.toLowerCase()}.user@poker-game.com`;
      
      const { error } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      
      if (!isLogin) {
        toast.success('Signed up successfully! Please check your email for verification.');
      } else {
        toast.success('Logged in successfully!');
        navigate('/');
      }
    } catch (error: any) {
      let errorMessage = error.message;
      // Handle specific error cases
      if (error.message.includes('User already registered')) {
        errorMessage = 'This username is already taken. Please try logging in instead.';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid username or password. Please try again.';
      }
      toast.error(errorMessage);
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-poker-background p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Poker</h2>
          <p className="mt-2 text-gray-600">Please sign in or create an account</p>
        </div>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <div className="flex gap-4">
            <Button
              className="flex-1"
              onClick={() => handleAuth(true)}
              disabled={loading}
            >
              Sign In
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => handleAuth(false)}
              disabled={loading}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;