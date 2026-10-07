import { useEffect, useState } from 'react'
import { Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/services/api'
import {
  connectWhatsAppSession,
  disconnectWhatsAppSession,
  getWhatsAppSession,
} from '@/services/whatsapp.service'

export function WhatsAppQrCard() {
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const data = await getWhatsAppSession()
    setSession(data)
    return data
  }

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const data = await getWhatsAppSession()
        if (!cancelled) setSession(data)
      } catch {
        if (!cancelled) setSession(null)
      }
    }
    tick()
    const timer = setInterval(tick, 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const handleConnect = async () => {
    setBusy(true)
    try {
      const data = await connectWhatsAppSession()
      setSession(data)
      toast.success('QR ready. Scan it from WhatsApp on your phone.')
      setTimeout(() => {
        refresh().catch(() => {})
      }, 1200)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this WhatsApp number?')) return
    setBusy(true)
    try {
      const data = await disconnectWhatsAppSession()
      setSession(data)
      toast.success('WhatsApp disconnected')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const status = session?.status || 'disconnected'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Link WhatsApp
          <Badge
            variant={
              status === 'connected'
                ? 'success'
                : status === 'qr'
                  ? 'warning'
                  : 'secondary'
            }
          >
            {status === 'connected'
              ? 'Connected'
              : status === 'qr'
                ? 'Waiting for scan'
                : status === 'connecting'
                  ? 'Connecting'
                  : 'Not linked'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No API key needed. On your phone open WhatsApp, then Linked devices,
          then Link a device, and scan this QR.
        </p>

        {status === 'connected' ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <Smartphone className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-sm font-medium">{session?.name || 'WhatsApp'}</p>
              <p className="text-xs text-muted-foreground">
                {session?.phone || 'Linked device'}
              </p>
            </div>
          </div>
        ) : null}

        {session?.qr ? (
          <div className="flex justify-center rounded-2xl border border-border bg-white p-4">
            <img
              src={session.qr}
              alt="WhatsApp QR code"
              className="h-64 w-64"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {status !== 'connected' ? (
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {status === 'qr' ? 'Refresh QR' : 'Show QR code'}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
