import { useEffect, useState } from 'react'
import { CalendarPlus, Clock3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { CardsSkeleton, StateGate } from '@/components/shared/PageState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from '@/services/appointments.service'
import { getErrorMessage } from '@/services/api'
import { formatDate, formatTime, titleCase } from '@/lib/format'

export default function AppointmentsPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listAppointments({
        page,
        limit: 8,
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

  const filtered = items.filter((item) => {
    const q = search.toLowerCase()
    if (!q) return true
    return `${item.title} ${item.contact?.name || ''} ${item.status}`
      .toLowerCase()
      .includes(q)
  })

  const handleConfirm = async (appointment) => {
    const previous = items
    setItems((prev) =>
      prev.map((item) =>
        item.id === appointment.id ? { ...item, status: 'confirmed' } : item,
      ),
    )
    try {
      const updated = await updateAppointment(appointment.id, {
        status: 'confirmed',
      })
      setItems((prev) =>
        prev.map((item) => (item.id === appointment.id ? updated : item)),
      )
      toast.success('Appointment confirmed')
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel/delete this appointment?')) return
    const previous = items
    setItems((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteAppointment(id)
      toast.success('Appointment deleted')
      load()
    } catch (err) {
      setItems(previous)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Scheduled meetings from the appointments API."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-48"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1)
                setStatus(value)
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {[
                  'scheduled',
                  'confirmed',
                  'completed',
                  'cancelled',
                  'no_show',
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

      <StateGate
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={!loading && filtered.length === 0}
        emptyTitle="No appointments"
        emptyDescription="Booked demos and discovery calls will appear here."
        skeleton={<CardsSkeleton count={4} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{appointment.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      with {appointment.contact?.name || 'Unknown contact'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appointment.status === 'confirmed' ? 'success' : 'warning'
                    }
                  >
                    {titleCase(appointment.status)}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Meta label="Date" value={formatDate(appointment.appointment_date)} />
                  <Meta
                    label="Time"
                    value={formatTime(appointment.appointment_time)}
                    icon={<Clock3 className="h-3.5 w-3.5" />}
                  />
                </div>

                <div className="flex gap-2">
                  {appointment.status !== 'confirmed' ? (
                    <Button size="sm" onClick={() => handleConfirm(appointment)}>
                      <CalendarPlus className="h-4 w-4" />
                      Confirm
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(appointment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
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

function Meta({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {value}
      </p>
    </div>
  )
}
