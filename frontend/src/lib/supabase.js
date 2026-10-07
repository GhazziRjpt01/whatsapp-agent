import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !String(supabaseUrl).includes('your_supabase') &&
      !String(supabaseAnonKey).includes('your_supabase'),
  )
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null

if (!isSupabaseConfigured()) {
  console.info(
    '[supabase] Realtime disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.',
  )
}
