import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { StateGate, TableSkeleton } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/services/api'
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
} from '@/services/team.service'

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'agent',
  status: 'offline',
}

const selectClass =
  'flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const statusVariant = {
  online: 'success',
  away: 'warning',
  offline: 'secondary',
  disabled: 'danger',
}

export default function TeamPage() {
  const { user } = useAuth()
  const canSeePasswords = user?.role === 'ceo'
  const canManage =
    canSeePasswords || user?.role === 'admin' || user?.role === 'manager'
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)

  const load = async (nextPage = page, nextSearch = query) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listTeamMembers({
        page: nextPage,
        limit: 10,
        search: nextSearch || undefined,
      })
      setItems(result.data || [])
      setMeta(result.meta || { page: nextPage, totalPages: 1, total: 0 })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page, query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setQuery(search.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setCreating(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        password: form.password,
      }
      await createTeamMember(payload)
      setForm(emptyForm)
      toast.success('Team member added')
      setPage(1)
      load(1, query)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleStatus = async (member, status) => {
    const previous = items
    setItems((current) =>
      current.map((item) => (item.id === member.id ? { ...item, status } : item)),
    )
    try {
      await updateTeamMember(member.id, { status })
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  const handleDelete = async (member) => {
    if (!window.confirm(`Remove ${member.full_name} from the team?`)) return
    const previous = items
    setItems((current) => current.filter((item) => item.id !== member.id))
    try {
      await deleteTeamMember(member.id)
      toast.success('Team member removed')
      load(page, query)
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Add support agents manually and set their role and availability."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          {canManage ? (
            <form
              onSubmit={handleCreate}
              className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-6"
            >
              <Input
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                required
                aria-label="Full name"
              />
              <Input
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
                aria-label="Work email"
              />
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                minLength={8}
                required
                autoComplete="new-password"
                aria-label="Password"
              />
              <select
                className={selectClass}
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value }))
                }
                aria-label="Role"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                {canSeePasswords ? <option value="ceo">CEO</option> : null}
                <option value="viewer">Viewer</option>
              </select>
              <select
                className={selectClass}
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                aria-label="Status"
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="disabled">Disabled</option>
              </select>
              <Button type="submit" disabled={creating}>
                <Plus className="h-4 w-4" />
                {creating ? 'Saving...' : 'Add member'}
              </Button>
            </form>
          ) : null}

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search team"
            />
          </div>

          <StateGate
            loading={loading}
            error={error}
            onRetry={() => load(page, query)}
            isEmpty={!loading && items.length === 0}
            emptyTitle="No team members yet"
            emptyDescription="Add a name, email, and role to create the first team member."
            skeleton={<TableSkeleton rows={4} cols={canSeePasswords ? 6 : 5} />}
          >
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    {canSeePasswords ? (
                      <th className="px-4 py-3 font-medium">Password</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-border transition hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium">{member.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.email}
                      </td>
                      {canSeePasswords ? (
                        <td className="px-4 py-3 font-mono text-xs">
                          {member.password || '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 capitalize">
                        {member.role === 'ceo' ? 'CEO' : member.role}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <select
                            className="h-8 rounded-lg border border-input bg-card px-2 text-xs capitalize"
                            value={member.status}
                            aria-label={`Status for ${member.full_name}`}
                            onChange={(e) => handleStatus(member, e.target.value)}
                          >
                            <option value="online">Online</option>
                            <option value="away">Away</option>
                            <option value="offline">Offline</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        ) : (
                          <Badge variant={statusVariant[member.status] || 'secondary'}>
                            {member.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && member.profile_id !== user?.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${member.full_name}`}
                            onClick={() => handleDelete(member)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StateGate>

          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total || 0}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
