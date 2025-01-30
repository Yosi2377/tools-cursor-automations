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

  const handleAuth = async (isLogin: boolean) => {
    try {
      setLoading(true);
      const { error } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      
      if (!isLogin) {
        toast('Signed up successfully! Please check your email for verification.');
      } else {
        toast('Logged in successfully!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message);
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
            onChange={(e) => setEmail(e.target.value)}
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