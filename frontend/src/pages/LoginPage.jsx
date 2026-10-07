import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Moon, ShieldCheck, Sparkles, Sun, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function savedLoginKey(portal) {
  return `nexora_saved_login_${portal}`
}

function readSavedLogin(portal) {
  try {
    const raw = localStorage.getItem(savedLoginKey(portal))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.email || !parsed?.password) return null
    return {
      email: String(parsed.email),
      password: String(parsed.password),
    }
  } catch {
    return null
  }
}

function LoginForm({ portal }) {
  const { login, logout, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = readSavedLogin(portal)
  const [email, setEmail] = useState(saved?.email || '')
  const [password, setPassword] = useState(saved?.password || '')
  const [remember, setRemember] = useState(Boolean(saved))
  const isCeo = portal === 'ceo'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim() || password.length < 4) {
      toast.error('Enter a valid email and password (min 4 characters).')
      return
    }
    try {
      const signedIn = await login({ email: email.trim(), password })
      const role = signedIn?.role
      if (isCeo && role !== 'ceo') {
        logout()
        toast.error('This page is for the CEO. Use the team member login.')
        return
      }
      if (!isCeo && role === 'ceo') {
        logout()
        toast.error('CEO accounts sign in from the CEO login page.')
        return
      }
      if (remember) {
        localStorage.setItem(
          savedLoginKey(portal),
          JSON.stringify({ email: email.trim(), password }),
        )
      } else {
        localStorage.removeItem(savedLoginKey(portal))
      }
      toast.success('Signed in successfully')
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to sign in. Is the backend running?')
    }
  }

  return (
    <Card className="border-border/80 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isCeo ? 'CEO sign in' : 'Team member sign in'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" autoComplete="off" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`${portal}-email`}>Work email</Label>
            <Input
              id={`${portal}-email`}
              name={`${portal}-email`}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${portal}-password`}>Password</Label>
            <Input
              id={`${portal}-password`}
              name={`${portal}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Save login on this device
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connecting...' : isCeo ? 'Continue as CEO' : 'Continue as team member'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          {isCeo ? (
            <Link className="text-foreground underline-offset-4 hover:underline" to="/login/team">
              Team member login
            </Link>
          ) : (
            <Link className="text-foreground underline-offset-4 hover:underline" to="/login/ceo">
              CEO login
            </Link>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function LoginChooser() {
  return (
    <Card className="border-border/80 bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">Choose how to sign in</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button asChild className="h-12 justify-start">
          <Link to="/login/ceo">
            <ShieldCheck className="h-4 w-4" />
            CEO login
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start">
          <Link to="/login/team">
            <UsersRound className="h-4 w-4" />
            Team member login
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function LoginPage({ portal = 'choose' }) {
  const { isAuthenticated, bootstrapping } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner label="Checking session..." />
      </div>
    )
  }

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18)_0%,transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14)_0%,transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12)_0%,transparent_40%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08)_0%,transparent_35%)]"
      />
      <div className="absolute right-4 top-4 z-10">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="border-border/80 bg-card/80 backdrop-blur"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-card/80 px-3 py-1 text-sm text-teal-800 shadow-sm backdrop-blur dark:border-teal-800/60 dark:text-teal-200">
            <Sparkles className="h-4 w-4" />
            WhatsApp AI Customer Support Platform
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-teal-300 shadow-xl dark:bg-teal-500 dark:text-slate-950">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Nexora
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {portal === 'ceo'
                    ? 'CEO workspace.'
                    : portal === 'team'
                      ? 'Team workspace.'
                      : 'Support that converts.'}
                </h1>
              </div>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              {portal === 'choose'
                ? 'CEO and team members sign in from separate pages.'
                : 'Saved login details appear here only after you choose to save them on this device.'}
            </p>
          </div>
        </section>

        {portal === 'choose' ? (
          <LoginChooser />
        ) : (
          <LoginForm key={portal} portal={portal} />
        )}
      </div>
    </div>
  )
}
