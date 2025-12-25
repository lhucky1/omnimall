
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

// This function creates a Supabase client for server-side rendering (SSR)
// and server components. It uses environment variables for secure access
// without relying on browser cookies.
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
  }

  // Use the standard createClient for server-side operations where cookies are not needed.
  return createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Disable auto-refreshing of the token on the server, as it's not needed for public data fetching.
        autoRefreshToken: false,
        // Disable persisting the session to prevent trying to use localStorage on the server.
        persistSession: false
      }
    }
  );
}
