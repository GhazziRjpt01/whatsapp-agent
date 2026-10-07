import { useEffect, useState } from 'react'
import { Bot, BrainCircuit, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { StateGate } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { getAiSettings, updateAiSettings } from '@/services/ai.service'
import { getErrorMessage } from '@/services/api'

export default function AiAgentPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAiSettings()
      setSettings(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (!settings) return
    const temperature = Number(settings.temperature)
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      toast.error('Temperature must be a number between 0 and 2')
      return
    }
    setSaving(true)
    try {
      const updated = await updateAiSettings({
        agent_name: settings.agent_name,
        system_prompt: settings.system_prompt,
        model: settings.model,
        temperature,
        enabled: Boolean(settings.enabled),
      })
      setSettings(updated)
      toast.success('AI settings saved')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (checked) => {
    if (!settings) return
    const previous = settings
    setSettings((prev) => ({ ...prev, enabled: checked }))
    try {
      const updated = await updateAiSettings({ enabled: checked })
      setSettings(updated)
      toast.success(checked ? 'AI agent enabled' : 'AI agent disabled')
    } catch (err) {
      setSettings(previous)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent"
        description="Configure the live AI agent settings from the backend."
        actions={
          <Button onClick={handleSave} disabled={saving || !settings}>
            <Sparkles className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save configuration'}
          </Button>
        }
      />

      <StateGate
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={!loading && !settings}
        emptyTitle="No AI settings"
        emptyDescription="Seed AI settings in the backend database first."
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Agent personality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Agent name</Label>
                <Input
                  value={settings?.agent_name || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, agent_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>System instructions</Label>
                <Textarea
                  className="min-h-36"
                  value={settings?.system_prompt || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      system_prompt: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={settings?.model || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, model: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings?.temperature ?? 0.4}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        temperature: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-4 md:col-span-2">
                  <span className="text-sm font-medium">Agent enabled</span>
                  <Switch
                    checked={Boolean(settings?.enabled)}
                    onCheckedChange={toggleEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Active model</p>
                </div>
                <p className="text-2xl font-semibold">{settings?.model}</p>
                <Badge variant="secondary">
                  Temperature {settings?.temperature}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Safety</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>System prompts stay on the backend</li>
                  <li>API keys are never sent to the browser</li>
                  <li>Handoff rules remain server-controlled</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </StateGate>
    </div>
  )
}
