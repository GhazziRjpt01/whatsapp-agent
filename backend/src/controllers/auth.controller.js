import { env } from '../config/env.js'
import { getSupabaseAdmin, handleSupabase } from '../config/supabase.js'
import { memoryAuth } from '../db/memoryStore.js'
import { ApiError } from '../utils/ApiError.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function login(req, res) {
  const { email, password } = req.body

  if (env.dataStore !== 'supabase') {
    const result = memoryAuth.login(email, password)
    return sendSuccess(res, {
      message: 'Signed in successfully',
      data: {
        access_token: result.token,
        user: result.user,
      },
    })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error || !data?.session?.access_token || !data.user) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const { data: profile } = await handleSupabase(
    supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle(),
    'Failed to load user profile',
  )
  if (!profile) {
    throw new ApiError(403, 'Staff profile is required')
  }

  const { data: member } = await handleSupabase(
    supabase
      .from('team_members')
      .select('role, status')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  )
  if (!member) {
    throw new ApiError(403, 'This account is not on the team')
  }
  if (member.status === 'disabled') {
    throw new ApiError(403, 'This account is disabled')
  }

  return sendSuccess(res, {
    message: 'Signed in successfully',
    data: {
      access_token: data.session.access_token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: member.role || profile.role,
        avatar_url: profile.avatar_url || null,
      },
    },
  })
}
