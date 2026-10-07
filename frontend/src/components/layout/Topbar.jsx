import { useNavigate } from 'react-router-dom'
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { formatRelative } from '@/lib/format'

export function Topbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const {
    notifications,
    unreadTotal,
    markNotificationRead,
    clearNotifications,
    connectionState,
  } = useRealtime()

  const unreadNotifications = notifications.filter((item) => !item.read).length

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations, leads, contacts..."
            className="pl-9"
            aria-label="Search conversations, leads, and contacts"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {connectionState === 'connected' ? (
            <Badge variant="success" className="hidden sm:inline-flex">
              Live
            </Badge>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 || unreadTotal > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications || unreadTotal}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearNotifications}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  No realtime notifications yet.
                </DropdownMenuItem>
              ) : (
                notifications.slice(0, 8).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="flex flex-col items-start gap-1 py-2"
                    onClick={() => {
                      markNotificationRead(item.id)
                      if (item.conversationId) {
                        navigate('/inbox')
                      } else if (item.leadId) {
                        navigate('/leads')
                      }
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      {!item.read ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                      ) : null}
                    </div>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelative(item.createdAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    {user?.initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {user?.role === 'ceo' ? 'CEO' : user?.role}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
