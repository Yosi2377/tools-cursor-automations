import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qmmbormkbgmyrcjnlxag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbWJvcm1rYmdteXJjam5seGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMDIzODgsImV4cCI6MjA1Mzc3ODM4OH0.L5QxdbHJEuWZcF7kAUXF_Cb54qlmhOa6ET8agPVnQq0";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage
    },
    global: {
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const maxRetries = 3;
        let attempt = 0;
        
        // Get the current session
        const session = supabase.auth.session();
        const accessToken = session?.access_token;
        
        while (attempt < maxRetries) {
          try {
            const response = await fetch(input, {
              ...init,
              headers: {
                ...init?.headers,
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
          } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
              console.error('All retry attempts failed:', error);
              throw error;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
        
        throw new Error('Failed to fetch after all retries');
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);