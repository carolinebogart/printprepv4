import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service role client bypasses RLS — use only in server-side code
// (webhooks, admin operations, background tasks)
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
