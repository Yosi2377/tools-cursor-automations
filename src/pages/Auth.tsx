import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Generate a valid email format that's consistent between login and signup
      const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedUsername}@poker-game.com`;

      if (!isLogin) {
        // Handle signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: sanitizedUsername
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            toast.error('This username is already taken. Please try another one or log in');
          } else {
            toast.error(signUpError.message);
          }
          console.error('Signup error:', signUpError);
          return;
        }

        if (signUpData.user) {
          toast.success('Signed up successfully! You can now log in');
          setIsLogin(true);
        }
      } else {
        // Handle login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          toast.error('Invalid username or password');
          console.error('Login error:', signInError);
          return;
        }

        if (signInData.user) {
          toast.success('Logged in successfully!');
          navigate('/');
        }
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred. Please try again');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-poker-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-poker-accent">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isLogin ? 'Please log in to continue' : 'Sign up to start playing'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-poker-accent text-black hover:bg-poker-accent/90"
            >
              {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-poker-accent hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;