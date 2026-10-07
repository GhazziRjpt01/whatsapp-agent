import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Bot, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { CardsSkeleton, StateGate } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getAnalyticsOverview } from '@/services/analytics.service'
import { listConversations } from '@/services/conversations.service'
import { listLeads } from '@/services/leads.service'
import { formatRelative } from '@/lib/format'

export default function DashboardPage() {
  const overviewQuery = useAsync(() => getAnalyticsOverview(), [])
  const conversationsQuery = useAsync(
    () => listConversations({ page: 1, limit: 5 }),
    [],
  )
  const leadsQuery = useAsync(() => listLeads({ page: 1, limit: 5 }), [])

  const loading =
    overviewQuery.loading || conversationsQuery.loading || leadsQuery.loading
  const error =
    overviewQuery.error || conversationsQuery.error || leadsQuery.error

  const stats = useMemo(() => {
    const overview = overviewQuery.data || {}
    return [
      {
        id: 'total',
        label: 'Total Conversations',
        value: String(overview.total_conversations ?? 0),
        change: `${overview.active_conversations ?? 0} active`,
        trend: 'up',
        icon: 'MessageSquare',
      },
      {
        id: 'active',
        label: 'Active Conversations',
        value: String(overview.active_conversations ?? 0),
        change: `${overview.total_messages ?? 0} messages`,
        trend: 'up',
        icon: 'MessageSquare',
      },
      {
        id: 'newLeads',
        label: 'New Leads',
        value: String(overview.new_leads ?? 0),
        change: `${overview.total_leads ?? 0} total leads`,
        trend: 'up',
        icon: 'UserPlus',
      },
      {
        id: 'qualified',
        label: 'Qualified Leads',
        value: String(overview.qualified_leads ?? 0),
        change: `Avg score ${overview.average_lead_score ?? 0}`,
        trend: 'up',
        icon: 'BadgeCheck',
      },
      {
        id: 'aiRate',
        label: 'AI Resolution Rate',
        value: `${overview.ai_resolution_rate ?? 0}%`,
        change: `${overview.knowledge_articles ?? 0} KB articles`,
        trend: 'up',
        icon: 'Bot',
      },
      {
        id: 'response',
        label: 'Upcoming Appointments',
        value: String(overview.upcoming_appointments ?? 0),
        change: `${overview.total_appointments ?? 0} total`,
        trend: 'down',
        icon: 'Timer',
      },
    ]
  }, [overviewQuery.data])

  const chartData = useMemo(() => {
    const overview = overviewQuery.data || {}
    return [
      {
        label: 'Conversations',
        value: overview.total_conversations || 0,
      },
      {
        label: 'Active',
        value: overview.active_conversations || 0,
      },
      {
        label: 'Leads',
        value: overview.total_leads || 0,
      },
      {
        label: 'Qualified',
        value: overview.qualified_leads || 0,
      },
      {
        label: 'Messages',
        value: overview.total_messages || 0,
      },
      {
        label: 'Appointments',
        value: overview.total_appointments || 0,
      },
    ]
  }, [overviewQuery.data])

  const reloadAll = () => {
    overviewQuery.reload().catch(() => {})
    conversationsQuery.reload().catch(() => {})
    leadsQuery.reload().catch(() => {})
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live overview powered by backend analytics and inbox APIs."
      />

      <StateGate
        loading={loading}
        error={error}
        onRetry={reloadAll}
        isEmpty={false}
        skeleton={
          <div className="space-y-4">
            <CardsSkeleton count={6} />
            <Skeleton className="h-80 w-full" />
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.id} {...stat} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Operations snapshot</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Current totals across conversations, leads, and appointments
                </p>
              </div>
              <Badge variant="secondary">Live API</Badge>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0f766e"
                    fill="url(#convFill)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(leadsQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                (leadsQuery.data || []).map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-border/70 bg-muted/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {lead.contact?.name || 'Unknown contact'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.contact?.company || '—'} · {lead.service || 'Service TBD'}
                        </p>
                      </div>
                      <Badge variant="success">{lead.lead_score ?? 0}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{lead.status}</span>
                      <span>{lead.budget || '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(conversationsQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              (conversationsQuery.data || []).map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {conversation.contact?.name || 'Unknown'}
                      </p>
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      Status: {conversation.status} · AI{' '}
                      {conversation.ai_enabled ? 'on' : 'off'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {conversation.ai_enabled ? (
                        <span className="inline-flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" /> AI
                        </span>
                      ) : (
                        'Human'
                      )}
                    </Badge>
                    <span>{formatRelative(conversation.last_message_at)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </StateGate>
    </div>
  )
}
