import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'
import { ApiError } from '../utils/ApiError.js'

let supabaseAdmin = null

export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new ApiError(
      500,
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseAdmin
}

export async function handleSupabase(query, fallbackMessage = 'Database error') {
  const { data, error, count } = await query

  if (error) {
    const status =
      error.code === 'PGRST116'
        ? 404
        : error.code === '23505'
          ? 409
          : error.code === '23503'
            ? 400
            : 500

    throw new ApiError(status, error.message || fallbackMessage, {
      code: error.code,
      details: error.details,
    })
  }

  return { data, count }
}
