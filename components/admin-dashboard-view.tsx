import Link from 'next/link'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCLP } from '@/lib/format'

export type AdminDashboardData = {
  activeUsers: number
  clients: number
  activeProviders: number
  verifiedProviders: number
  recentBookings: number
  bookingsThirtyDays: number
  collected: number
  pendingPayments: number
  conversion: number
  paymentRevenueThirtyDays: number
  cancellationCount: number
  totalBookings: number
  statusSummary: { label: string; count: number }[]
  recent: {
    id: string
    code: string
    event_name: string
    event_date: string
    status: string
    total: number
    clientName: string | null
  }[]
}

export function AdminDashboardView({
  data,
  preview = false,
}: {
  data: AdminDashboardData
  preview?: boolean
}) {
  const maxStatusCount = Math.max(1, ...data.statusSummary.map(({ count }) => count))

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {preview && (
        <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          Vista previa: estas métricas y reservas son ficticias.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Administración</p>
          <h1 className="mt-1 text-3xl font-extrabold">Dashboard ejecutivo</h1>
          <p className="mt-2 text-muted-foreground">Estado comercial y operativo de Brasa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} variant="outline" render={<Link href="/admin/usuarios" />}>
            <Users /> Usuarios
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/admin/reservas" />}>
            <CalendarDays /> Reservas
          </Button>
          <Button nativeButton={false} render={<Link href="/admin/prestadores" />}>
            <BriefcaseBusiness /> Prestadores
          </Button>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} label="Usuarios activos" value={String(data.activeUsers)} detail={`${data.clients} clientes registrados`} />
        <Kpi icon={BriefcaseBusiness} label="Prestadores activos" value={String(data.activeProviders)} detail={`${data.verifiedProviders} perfiles verificados`} />
        <Kpi icon={CalendarDays} label="Reservas últimos 7 días" value={String(data.recentBookings)} detail={`${data.bookingsThirtyDays} en los últimos 30 días`} />
        <Kpi icon={CircleDollarSign} label="Ingresos registrados" value={formatCLP(data.collected)} detail={`${formatCLP(data.pendingPayments)} pendientes`} accent />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon={TrendingUp} label="Tasa de conversión" value={`${data.conversion}%`} detail="Reservas confirmadas o completadas" />
        <Kpi icon={Clock3} label="Ingresos últimos 30 días" value={formatCLP(data.paymentRevenueThirtyDays)} detail="Pagos autorizados o pagados" />
        <Kpi icon={AlertTriangle} label="Reservas canceladas" value={String(data.cancellationCount)} detail={`${data.totalBookings} reservas totales`} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><CardTitle>Reservas recientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.recent.map(booking => (
              <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{booking.event_name}</b>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">
                      {booking.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.code} · {booking.event_date} · {booking.clientName || 'Cliente'}
                  </p>
                </div>
                <b>{formatCLP(booking.total)}</b>
              </div>
            ))}
            {data.recent.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin reservas todavía.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Estado de reservas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.statusSummary.map(({ label, count }) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <b>{count}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="mt-3 font-bold">Verificación de prestadores</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.verifiedProviders} de {data.activeProviders} prestadores activos están verificados.
              </p>
              <Button nativeButton={false} variant="outline" className="mt-4 w-full" render={<Link href="/admin/prestadores" />}>
                Gestionar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'border-primary/30 bg-primary/[0.03]' : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">{label}</span>
          <Icon className="size-4" />
        </div>
        <p className="mt-3 text-2xl font-extrabold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
