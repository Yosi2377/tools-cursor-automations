import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional checks
    if (email.length > 254) return false;
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('..')) return false;

    const [localPart, domain] = email.split('@');
    if (localPart.length > 64) return false;
    if (domain.length > 255) return false;

    return true;
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (!email || !password) {
        toast.error('Please enter both email and password');
        return;
      }

      if (!validateEmail(email)) {
        toast.error('Please enter a valid email address (e.g., user@example.com)');
        return;
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
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
      if (error.message.includes('email_address_invalid')) {
        errorMessage = 'The email address format is invalid. Please use a valid email address.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
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