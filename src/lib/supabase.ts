import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

/** A public anon key is safe for the browser when paired with proper database RLS policies. */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

/** Temporary, read-only connectivity check; returns status only and never logs credentials. */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string; status?: number }> {
  if (!supabase) return { connected: false, message: 'Supabase credentials are not configured.' }
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabasePublishableKey },
    })
    if (!response.ok) return { connected: false, message: `Supabase responded with HTTP ${response.status}.`, status: response.status }
    return { connected: true, message: 'Supabase endpoint connection succeeded.', status: response.status }
  } catch {
    return { connected: false, message: 'Could not reach the Supabase endpoint.' }
  }
}
