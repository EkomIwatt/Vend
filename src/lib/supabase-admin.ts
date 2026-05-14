import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key. Bypasses RLS.
 *
 * Use this from server-side routes that:
 *   - Need to manage auth.users (signup, delete)
 *   - Need to read public seller info without a user session (/pay/[sellerId])
 *   - Need to write to tables on behalf of webhook callers (no session)
 *
 * NEVER ship this client to the browser. Never log the key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin client misconfigured (missing URL or service role key)')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
