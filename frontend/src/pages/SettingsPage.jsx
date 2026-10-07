import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { StateGate } from '@/components/shared/PageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getSettingsBundle,
  saveAiSettings,
  saveWorkspaceSettings,
} from '@/services/settings.service'
import { getErrorMessage } from '@/services/api'
import { WhatsAppQrCard } from '@/components/settings/WhatsAppQrCard'

export default function SettingsPage() {
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSettingsBundle()
      setBundle(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateWorkspace = (key, value) => {
    setBundle((prev) => ({
      ...prev,
      workspace: { ...prev.workspace, [key]: value },
    }))
  }

  const updateNotification = (key, value) => {
    setBundle((prev) => ({
      ...prev,
      workspace: {
        ...prev.workspace,
        notifications: {
          ...prev.workspace.notifications,
          [key]: value,
        },
      },
    }))
  }

  const saveWorkspace = async () => {
    setSaving(true)
    try {
      await saveWorkspaceSettings(bundle.workspace)
      toast.success('Workspace preferences saved')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const saveAi = async () => {
    const temperature = Number(bundle.aiSettings.temperature)
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      toast.error('Temperature must be a number between 0 and 2')
      return
    }
    setSaving(true)
    try {
      const updated = await saveAiSettings({
        agent_name: bundle.aiSettings.agent_name,
        enabled: bundle.aiSettings.enabled,
        model: bundle.aiSettings.model,
        temperature,
        system_prompt: bundle.aiSettings.system_prompt,
      })
      setBundle((prev) => ({ ...prev, aiSettings: updated }))
      toast.success('AI settings updated')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace preferences plus live AI/backend settings."
      />

      <StateGate
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={!loading && !bundle}
        emptyTitle="Settings unavailable"
        emptyDescription="Start the backend API and try again."
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        <Tabs defaultValue="workspace">
          <TabsList>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace">
            <Card>
              <CardHeader>
                <CardTitle>Workspace profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Company name"
                  value={bundle?.workspace.company_name}
                  onChange={(value) => updateWorkspace('company_name', value)}
                />
                <Field
                  label="Support email"
                  type="email"
                  value={bundle?.workspace.support_email}
                  onChange={(value) => updateWorkspace('support_email', value)}
                />
                <Field
                  label="Timezone"
                  value={bundle?.workspace.timezone}
                  onChange={(value) => updateWorkspace('timezone', value)}
                />
                <Field
                  label="Default currency"
                  value={bundle?.workspace.currency}
                  onChange={(value) => updateWorkspace('currency', value)}
                />
                <div className="md:col-span-2">
                  <Button onClick={saveWorkspace} disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI settings API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  label="Agent name"
                  value={bundle?.aiSettings?.agent_name}
                  onChange={(value) =>
                    setBundle((prev) => ({
                      ...prev,
                      aiSettings: { ...prev.aiSettings, agent_name: value },
                    }))
                  }
                />
                <Field
                  label="Model"
                  value={bundle?.aiSettings?.model}
                  onChange={(value) =>
                    setBundle((prev) => ({
                      ...prev,
                      aiSettings: { ...prev.aiSettings, model: value },
                    }))
                  }
                />
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <span className="text-sm font-medium">Enabled</span>
                  <Switch
                    checked={Boolean(bundle?.aiSettings?.enabled)}
                    onCheckedChange={(checked) =>
                      setBundle((prev) => ({
                        ...prev,
                        aiSettings: { ...prev.aiSettings, enabled: checked },
                      }))
                    }
                  />
                </div>
                <Button onClick={saveAi} disabled={saving}>
                  Save AI settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppQrCard />
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Alert preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['new_conversation', 'New inbound conversation'],
                  ['hot_lead', 'Hot lead detected'],
                  ['appointment_booked', 'Appointment booked'],
                  ['ai_escalation', 'AI escalation required'],
                ].map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <Switch
                      checked={Boolean(bundle?.workspace.notifications?.[key])}
                      onCheckedChange={(checked) =>
                        updateNotification(key, checked)
                      }
                    />
                  </div>
                ))}
                <Button onClick={saveWorkspace} disabled={saving}>
                  Save notification preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </StateGate>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
