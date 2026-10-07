import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  Users,
  Target,
  CalendarDays,
  Bot,
  BookOpen,
  BarChart3,
  UsersRound,
  Settings,
  LogOut,
  MessageCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/ai-agent', label: 'AI Agent', icon: Bot },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/team', label: 'Team', icon: UsersRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { unreadTotal } = useRealtime()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-900/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Nexora</p>
              <p className="text-xs text-sidebar-muted">WhatsApp AI Desk</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-white/10 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="soft-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-white shadow-sm'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="flex-1">{item.label}</span>
                {item.to === '/inbox' && unreadTotal > 0 ? (
                  <Badge className="h-5 min-w-5 justify-center rounded-full bg-teal-500 px-1.5 text-[10px] text-white">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </Badge>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
