
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_URL.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase anonymous key is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

// This client is for use in client components and pages
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
