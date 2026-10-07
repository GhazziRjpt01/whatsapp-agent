import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import api, { getErrorMessage } from '@/services/api'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

function readStoredUser() {
  try {
    const saved = localStorage.getItem('auth_user')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function buildUser(email, extras = {}) {
  const name =
    extras.full_name ||
    email?.split('@')[0] ||
    'Support User'
  const pretty = String(name)
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return {
    id: extras.id || null,
    name: pretty,
    role: extras.role || 'admin',
    email: email || 'ayesha@nexora.io',
    initials: pretty
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }
}

function allowDevAuthFallback() {
  if (isSupabaseConfigured()) return false
  return (
    import.meta.env.DEV === true ||
    import.meta.env.VITE_ALLOW_DEV_AUTH === 'true'
  )
}

function clearSessionStorage() {
  localStorage.removeItem('auth_user')
  localStorage.removeItem('access_token')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const token = localStorage.getItem('access_token')
      const stored = readStoredUser()

      if (!token) {
        clearSessionStorage()
        if (!cancelled) {
          setUser(null)
          setBootstrapping(false)
        }
        return
      }

      try {
        if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.access_token) {
            await supabase.realtime.setAuth(data.session.access_token)
            localStorage.setItem('access_token', data.session.access_token)
          }
        }

        const me = await api.get('/auth/me')
        const profile = me.data?.data
        if (!profile) throw new Error('Invalid session')

        const nextUser = buildUser(profile.email || stored?.email, {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
        })

        if (!cancelled) {
          setUser(nextUser)
          localStorage.setItem('auth_user', JSON.stringify(nextUser))
        }
      } catch {
        clearSessionStorage()
        if (isSupabaseConfigured() && supabase) {
          await supabase.auth.signOut().catch(() => {})
        }
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    try {
      let token = null
      let nextUser = buildUser(email)

      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error || !data?.session?.access_token) {
          throw new Error(error?.message || 'Invalid email or password')
        }

        token = data.session.access_token
        nextUser = buildUser(data.user?.email || email, {
          id: data.user?.id,
          full_name: data.user?.user_metadata?.full_name,
        })
        await supabase.realtime.setAuth(token)
      } else if (allowDevAuthFallback()) {
        const response = await api.post('/auth/login', {
          email: email.trim(),
          password,
        })
        token = response.data?.data?.access_token
        const signedIn = response.data?.data?.user
        if (!token || !signedIn) {
          throw new Error('Invalid email or password')
        }
        nextUser = buildUser(signedIn.email || email, {
          id: signedIn.id,
          full_name: signedIn.full_name,
          role: signedIn.role,
        })
      } else {
        throw new Error(
          'Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        )
      }

      localStorage.setItem('access_token', token)

      const me = await api.get('/auth/me')
      const profile = me.data?.data
      if (profile) {
        nextUser = buildUser(profile.email || email, {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
        })
      }

      setUser(nextUser)
      localStorage.setItem('auth_user', JSON.stringify(nextUser))
      return nextUser
    } catch (error) {
      clearSessionStorage()
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut().catch(() => {})
      }
      throw new Error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    clearSessionStorage()
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(() => {})
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      bootstrapping,
      setUser,
      setLoading,
      login,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, bootstrapping, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
