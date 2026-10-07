import { useEffect, useState } from 'react'
import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { CardsSkeleton, StateGate } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
} from '@/services/knowledge.service'
import { getErrorMessage } from '@/services/api'
import { formatRelative } from '@/lib/format'

export default function KnowledgeBasePage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listKnowledge({
        page,
        limit: 9,
        category: category || undefined,
      })
      setItems(result.data || [])
      setMeta(result.meta || { page, totalPages: 1, total: 0 })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category])

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await createKnowledge(form)
      setForm({ title: '', content: '', category: '' })
      toast.success('Knowledge article created')
      setPage(1)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this knowledge article?')) return
    const previous = items
    setItems((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteKnowledge(id)
      toast.success('Article deleted')
      load()
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Articles used by the AI agent, loaded from the knowledge API."
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Content"
              value={form.content}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, content: e.target.value }))
              }
              required
            />
            <Button type="submit" disabled={saving} className="md:col-span-2 md:w-fit">
              <FilePlus2 className="h-4 w-4" />
              {saving ? 'Saving...' : 'Add document'}
            </Button>
          </form>
          <Input
            className="max-w-sm"
            placeholder="Filter by category..."
            value={category}
            onChange={(e) => {
              setPage(1)
              setCategory(e.target.value)
            }}
          />
        </CardContent>
      </Card>

      <StateGate
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={!loading && items.length === 0}
        emptyTitle="No knowledge articles"
        emptyDescription="Add pricing, onboarding, and support docs for the AI agent."
        skeleton={<CardsSkeleton count={6} />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-accent p-2.5 text-accent-foreground">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{doc.category || 'General'}</Badge>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{doc.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {doc.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {formatRelative(doc.updated_at || doc.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </StateGate>

      <Pagination
        page={meta.page || page}
        totalPages={meta.totalPages || 1}
        total={meta.total || 0}
        onPageChange={setPage}
      />
    </div>
  )
}
