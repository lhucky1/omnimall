import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// This is the standard client for use in the browser (client components).
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

// This is a supabase instance that is used across the app.
export const supabase = createClient()


let supabaseAdmin: ReturnType<typeof createSupabaseClient> | null = null;

// This is an admin client for use in server-side actions.
// It is created here to easily share the instance.
export const getSupabaseAdmin = () => {
    if (supabaseAdmin) {
        return supabaseAdmin;
    }
    // Ensure the service role key is provided.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("SUPABASE_SERVICE_ROLE_KEY is not set. Admin client will not be created.");
        return null;
    }
    supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return supabaseAdmin;
};
