// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qmmbormkbgmyrcjnlxag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbWJvcm1rYmdteXJjam5seGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMDIzODgsImV4cCI6MjA1Mzc3ODM4OH0.L5QxdbHJEuWZcF7kAUXF_Cb54qlmhOa6ET8agPVnQq0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);