import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { StateGate, TableSkeleton } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listLeads, updateLead } from '@/services/leads.service'
import { getErrorMessage } from '@/services/api'
import { formatRelative, titleCase } from '@/lib/format'

const stageVariant = {
  qualified: 'success',
  proposal: 'info',
  new: 'secondary',
  contacted: 'warning',
  nurture: 'outline',
  won: 'success',
  lost: 'danger',
}

export default function LeadsPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listLeads({
        page,
        limit: 10,
        status: status === 'all' ? undefined : status,
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
  }, [page, status])

  const handleStatusChange = async (lead, nextStatus) => {
    const previous = items
    setItems((prev) =>
      prev.map((item) =>
        item.id === lead.id ? { ...item, status: nextStatus } : item,
      ),
    )
    try {
      const updated = await updateLead(lead.id, { status: nextStatus })
      setItems((prev) =>
        prev.map((item) => (item.id === lead.id ? updated : item)),
      )
      toast.success('Lead updated')
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  const summary = {
    total: meta.total || items.length,
    avgScore:
      items.length === 0
        ? 0
        : Math.round(
            items.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) /
              items.length,
          ),
    qualified: items.filter((lead) =>
      ['qualified', 'proposal', 'won'].includes(lead.status),
    ).length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Pipeline data from the backend leads API."
        actions={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1)
                setStatus(value)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {[
                  'new',
                  'contacted',
                  'qualified',
                  'proposal',
                  'won',
                  'lost',
                  'nurture',
                ].map((value) => (
                  <SelectItem key={value} value={value}>
                    {titleCase(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Visible leads', value: summary.total },
          { label: 'Avg score (page)', value: summary.avgScore },
          { label: 'Qualified on page', value: summary.qualified },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StateGate
            loading={loading}
            error={error}
            onRetry={load}
            isEmpty={!loading && items.length === 0}
            emptyTitle="No leads found"
            emptyDescription="Leads created by the AI agent or inbox will appear here."
            skeleton={<TableSkeleton rows={5} cols={4} />}
          >
            {items.map((lead) => (
              <div
                key={lead.id}
                className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-[1.2fr_1fr_auto_auto] md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {lead.contact?.name || 'Unknown contact'}
                    </p>
                    <Badge variant="outline">{lead.id.slice(0, 8)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lead.contact?.company || '—'} · {lead.service || 'Service TBD'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Source · {lead.source || 'whatsapp'}
                  </p>
                  <p className="mt-1">
                    Updated {formatRelative(lead.updated_at || lead.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={stageVariant[lead.status] || 'secondary'}>
                    {titleCase(lead.status)}
                  </Badge>
                  <Badge variant="success">Score {lead.lead_score ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <p className="text-right text-base font-semibold">
                    {lead.budget || '—'}
                  </p>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => handleStatusChange(lead, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'new',
                        'contacted',
                        'qualified',
                        'proposal',
                        'won',
                        'lost',
                        'nurture',
                      ].map((value) => (
                        <SelectItem key={value} value={value}>
                          {titleCase(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
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
