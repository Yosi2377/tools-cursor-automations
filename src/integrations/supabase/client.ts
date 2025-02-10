
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
      storage: localStorage,
      storageKey: 'poker-auth-token',
      flowType: 'pkce'
    },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        return fetch(input, init).catch(err => {
          console.error('Supabase fetch error:', err);
          throw err;
        });
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
