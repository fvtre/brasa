import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardView } from '@/components/admin-dashboard-view'

export const dynamic = 'force-dynamic'

type DashboardBooking = {
  id: string
  code: string
  event_name: string
  event_date: string
  status: string
  total: number
  created_at: string
  client: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

export default async function AdminDashboard() {
  await requireRole(['administrador'])
  const supabase = await createClient()

  const [usersResult, providersResult, bookingsResult, paymentsResult, recentResult] = await Promise.all([
    supabase.from('profiles').select('role,active,created_at'),
    supabase.from('service_providers').select('active,verified'),
    supabase.from('bookings').select('status,total,created_at,event_date'),
    supabase.from('payments').select('amount,status,created_at'),
    supabase.from('bookings').select(`
      id,code,event_name,event_date,status,total,created_at,
      client:profiles!bookings_client_id_fkey(full_name)
    `).order('created_at', { ascending: false }).limit(8),
  ])

  if (usersResult.error) throw new Error(usersResult.error.message)
  if (providersResult.error) throw new Error(providersResult.error.message)
  if (bookingsResult.error) throw new Error(bookingsResult.error.message)
  if (paymentsResult.error) throw new Error(paymentsResult.error.message)
  if (recentResult.error) throw new Error(recentResult.error.message)

  const users = usersResult.data || []
  const providers = providersResult.data || []
  const bookings = bookingsResult.data || []
  const payments = paymentsResult.data || []
  const recent = (recentResult.data || []) as unknown as DashboardBooking[]

  const activeUsers = users.filter(user => user.active).length
  const clients = users.filter(user => user.role === 'cliente').length
  const activeProviders = providers.filter(provider => provider.active).length
  const verifiedProviders = providers.filter(provider => provider.verified).length
  const collected = payments
    .filter(payment => ['pagado', 'autorizado'].includes(payment.status))
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)
  const pendingPayments = payments
    .filter(payment => payment.status === 'pendiente')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)

  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const recentBookings = bookings.filter(booking => new Date(booking.created_at).getTime() >= sevenDaysAgo).length
  const bookingsThirtyDays = bookings.filter(booking => new Date(booking.created_at).getTime() >= thirtyDaysAgo).length
  const paymentRevenueThirtyDays = payments
    .filter(payment =>
      ['pagado', 'autorizado'].includes(payment.status)
      && new Date(payment.created_at).getTime() >= thirtyDaysAgo
    )
    .reduce((sum, payment) => sum + (payment.amount || 0), 0)

  const confirmedOrComplete = bookings.filter(booking =>
    ['confirmada', 'en_preparacion', 'en_curso', 'completada'].includes(booking.status)
  ).length
  const cancellationCount = bookings.filter(booking => booking.status === 'cancelada').length
  const conversion = bookings.length ? Math.round((confirmedOrComplete / bookings.length) * 100) : 0

  const statusSummary = [
    ['Pendientes', bookings.filter(booking => booking.status === 'pendiente').length],
    ['Esperando confirmación', bookings.filter(booking => booking.status === 'esperando_confirmacion').length],
    ['Confirmadas', bookings.filter(booking => ['confirmada', 'esperando_pago', 'en_preparacion'].includes(booking.status)).length],
    ['En curso', bookings.filter(booking => booking.status === 'en_curso').length],
    ['Completadas', bookings.filter(booking => booking.status === 'completada').length],
    ['Canceladas', cancellationCount],
  ] as const
  const maxStatusCount = Math.max(1, ...statusSummary.map(([, count]) => count))

  const dashboardRecent = recent.map(booking => {
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
    return { ...booking, clientName: client?.full_name || null }
  })

  return (
    <AdminDashboardView
      data={{
        activeUsers,
        clients,
        activeProviders,
        verifiedProviders,
        recentBookings,
        bookingsThirtyDays,
        collected,
        pendingPayments,
        conversion,
        paymentRevenueThirtyDays,
        cancellationCount,
        totalBookings: bookings.length,
        statusSummary: statusSummary.map(([label, count]) => ({ label, count })),
        recent: dashboardRecent,
      }}
    />
  )
}
