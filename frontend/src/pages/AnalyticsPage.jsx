import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardsSkeleton, StateGate } from '@/components/shared/PageState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getAnalyticsOverview } from '@/services/analytics.service'

export default function AnalyticsPage() {
  const { data, error, loading, reload } = useAsync(
    () => getAnalyticsOverview(),
    [],
  )

  const metrics = useMemo(() => {
    const overview = data || {}
    return [
      {
        label: 'Messages Handled',
        value: String(overview.total_messages ?? 0),
        change: `${overview.ai_resolution_rate ?? 0}% AI share`,
      },
      {
        label: 'Active Conversations',
        value: String(overview.active_conversations ?? 0),
        change: `${overview.total_conversations ?? 0} total`,
      },
      {
        label: 'Lead Conversion Pool',
        value: String(overview.qualified_leads ?? 0),
        change: `${overview.total_leads ?? 0} total leads`,
      },
      {
        label: 'Avg Lead Score',
        value: String(overview.average_lead_score ?? 0),
        change: `${overview.upcoming_appointments ?? 0} upcoming meetings`,
      },
    ]
  }, [data])

  const chartData = useMemo(
    () => [
      { label: 'Contacts', value: data?.total_contacts || 0 },
      { label: 'Conversations', value: data?.total_conversations || 0 },
      { label: 'Messages', value: data?.total_messages || 0 },
      { label: 'Leads', value: data?.total_leads || 0 },
      { label: 'Qualified', value: data?.qualified_leads || 0 },
      { label: 'Appointments', value: data?.total_appointments || 0 },
    ],
    [data],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Live metrics from GET /api/analytics/overview."
      />

      <StateGate
        loading={loading}
        error={error}
        onRetry={() => reload().catch(() => {})}
        isEmpty={false}
        skeleton={
          <div className="space-y-4">
            <CardsSkeleton count={4} />
            <Skeleton className="h-80 w-full" />
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {metric.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Volume by entity</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['AI resolution rate', `${data?.ai_resolution_rate || 0}%`],
                [
                  'Qualified lead share',
                  data?.total_leads
                    ? `${Math.round(
                        ((data.qualified_leads || 0) / data.total_leads) * 100,
                      )}%`
                    : '0%',
                ],
                [
                  'Active conversation share',
                  data?.total_conversations
                    ? `${Math.round(
                        ((data.active_conversations || 0) /
                          data.total_conversations) *
                          100,
                      )}%`
                    : '0%',
                ],
                [
                  'Knowledge coverage',
                  `${data?.knowledge_articles || 0} articles`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{
                        width: String(value).includes('%') ? value : '40%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </StateGate>
    </div>
  )
}
