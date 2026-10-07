import { env } from '../config/env.js'
import { getSupabaseAdmin } from '../config/supabase.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { memoryAuth } from '../db/memoryStore.js'

const DEV_USER = {
  id: '99999999-9999-9999-9999-999999999001',
  email: 'ayesha@nexora.io',
  full_name: 'Ayesha Khan',
  role: 'ceo',
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing or invalid Authorization header')
  }

  if (env.allowDevAuthBypass && token === env.devAuthToken) {
    req.user = DEV_USER
    return next()
  }

  if (env.dataStore === 'memory') {
    const user = memoryAuth.verify(token)
    if (!user) {
      throw new ApiError(401, 'Invalid authentication token')
    }
    req.user = user
    return next()
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    throw new ApiError(500, 'Failed to load user profile')
  }

  if (!profile) {
    throw new ApiError(
      403,
      'Staff profile is required. Ask an admin to provision your account.',
    )
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    full_name: profile.full_name || data.user.email,
    role: profile.role,
    avatar_url: profile.avatar_url || null,
  }

  return next()
})

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'))
    }

    const allowed =
      req.user.role === 'ceo' && roles.includes('admin')
        ? [...roles, 'ceo']
        : roles

    if (allowed.length > 0 && !allowed.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action'),
      )
    }

    return next()
  }
}
