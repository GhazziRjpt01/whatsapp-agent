import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { StateGate, TableSkeleton } from '@/components/shared/PageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createContact,
  deleteContact,
  listContacts,
} from '@/services/contacts.service'
import { getErrorMessage } from '@/services/api'
import { formatRelative } from '@/lib/format'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  company: '',
  notes: '',
}

export default function ContactsPage() {
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
      const result = await listContacts({
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
    setCreating(true)
    const optimistic = {
      id: `temp-${Date.now()}`,
      ...form,
      created_at: new Date().toISOString(),
    }
    setItems((prev) => [optimistic, ...prev])
    try {
      const created = await createContact(form)
      setItems((prev) =>
        prev.map((item) => (item.id === optimistic.id ? created : item)),
      )
      setForm(emptyForm)
      toast.success('Contact created')
      load(1, query)
      setPage(1)
    } catch (err) {
      setItems((prev) => prev.filter((item) => item.id !== optimistic.id))
      toast.error(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    const previous = items
    setItems((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteContact(id)
      toast.success('Contact deleted')
      load(page, query)
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Live contact records from the backend contacts API."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <form
            onSubmit={handleCreate}
            className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-5"
          >
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
            />
            <Button type="submit" disabled={creating}>
              <Plus className="h-4 w-4" />
              {creating ? 'Saving...' : 'Add contact'}
            </Button>
          </form>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <StateGate
            loading={loading}
            error={error}
            onRetry={() => load(page, query)}
            isEmpty={!loading && items.length === 0}
            emptyTitle="No contacts found"
            emptyDescription="Create a contact or adjust your search."
            skeleton={<TableSkeleton rows={6} cols={5} />}
          >
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-t border-border transition hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium">{contact.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {contact.company || '—'}
                      </td>
                      <td className="px-4 py-3">{contact.phone}</td>
                      <td className="px-4 py-3">{contact.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelative(contact.updated_at || contact.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete contact ${contact.name}`}
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
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
