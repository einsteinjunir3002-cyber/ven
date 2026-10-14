import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/server/env';

export const DEFAULT_GUEST_USER_ID = 'a1111111-1111-4111-a111-111111111111';

export function createAdminClient() {
  return createSupabaseClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
