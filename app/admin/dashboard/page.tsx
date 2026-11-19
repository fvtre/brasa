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
  client_id: string
  client: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

export default async function AdminDashboard() {
  await requireRole(['administrador'])
  const supabase = await createClient()

  const [usersResult, providersResult, bookingsResult, paymentsResult, bookingItemsResult, categoriesResult] = await Promise.all([
    supabase.from('profiles').select('role,active,created_at'),
    supabase.from('service_providers').select('active,verified'),
    supabase.from('bookings').select(`
      id,code,event_name,event_date,status,total,created_at,client_id,
      client:profiles!bookings_client_id_fkey(full_name)
    `).order('created_at', { ascending: false }),
    supabase.from('payments').select('amount,status,created_at'),
    supabase.from('booking_items').select('booking_id,category_slug,line_total'),
    supabase.from('service_categories').select('slug,name'),
  ])

  if (usersResult.error) throw new Error(usersResult.error.message)
  if (providersResult.error) throw new Error(providersResult.error.message)
  if (bookingsResult.error) throw new Error(bookingsResult.error.message)
  if (paymentsResult.error) throw new Error(paymentsResult.error.message)
  if (bookingItemsResult.error) throw new Error(bookingItemsResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)

  const users = usersResult.data || []
  const providers = providersResult.data || []
  const bookings = (bookingsResult.data || []) as unknown as DashboardBooking[]
  const payments = paymentsResult.data || []
  const bookingItems = bookingItemsResult.data || []
  const categoriesBySlug = new Map((categoriesResult.data || []).map(category => [category.slug, category.name]))

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
  const eligibleStatuses = new Set(['confirmada', 'en_preparacion', 'en_curso', 'completada'])
  const customerBookings = new Map<string, { name: string | null; count: number }>()
  for (const booking of bookings) {
    if (!eligibleStatuses.has(booking.status)) continue
    const customer = customerBookings.get(booking.client_id) || {
      name: (Array.isArray(booking.client) ? booking.client[0] : booking.client)?.full_name || null,
      count: 0,
    }
    customer.count += 1
    customerBookings.set(booking.client_id, customer)
  }
  const topClients = [...customerBookings.entries()]
    .filter(([, customer]) => customer.count > 1)
    .map(([id, customer]) => ({ id, name: customer.name || 'Cliente', bookings: customer.count }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5)

  const bookingsById = new Map(bookings.map(booking => [booking.id, booking]))
  const categoryStats = new Map<string, { bookings: Set<string>; amount: number }>()
  for (const item of bookingItems) {
    const booking = bookingsById.get(item.booking_id)
    if (!booking || new Date(booking.created_at).getTime() < thirtyDaysAgo) continue
    const stats = categoryStats.get(item.category_slug) || { bookings: new Set<string>(), amount: 0 }
    stats.bookings.add(item.booking_id)
    stats.amount += item.line_total || 0
    categoryStats.set(item.category_slug, stats)
  }
  const topCategories = [...categoryStats.entries()]
    .map(([slug, stats]) => ({
      name: categoriesBySlug.get(slug) || slug.replaceAll('-', ' '),
      bookings: stats.bookings.size,
      amount: stats.amount,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 6)
  const exportCategories = [...categoryStats.entries()]
    .map(([slug, stats]) => ({
      name: categoriesBySlug.get(slug) || slug.replaceAll('-', ' '),
      bookings: stats.bookings.size,
      amount: stats.amount,
    }))
    .sort((a, b) => b.bookings - a.bookings)
  const exportClients = [...customerBookings.values()]
    .filter(customer => customer.count > 1)
    .map(customer => ({ name: customer.name || 'Cliente', bookings: customer.count }))
    .sort((a, b) => b.bookings - a.bookings)

  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setUTCDate(1)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCMonth(date.getUTCMonth() - (5 - index))
    return date.toISOString().slice(0, 7)
  })
  const monthLabels = new Intl.DateTimeFormat('es-CL', { month: 'short', timeZone: 'UTC' })
  const monthlyBookings = monthKeys.map(key => {
    const [year, month] = key.split('-').map(Number)
    return {
      label: monthLabels.format(new Date(Date.UTC(year, month - 1, 1))),
      count: bookings.filter(booking => booking.created_at.slice(0, 7) === key).length,
    }
  })

  const statusSummary = [
    ['Pendientes', bookings.filter(booking => booking.status === 'pendiente').length],
    ['Esperando confirmación', bookings.filter(booking => booking.status === 'esperando_confirmacion').length],
    ['Confirmadas', bookings.filter(booking => ['confirmada', 'esperando_pago', 'en_preparacion'].includes(booking.status)).length],
    ['En curso', bookings.filter(booking => booking.status === 'en_curso').length],
    ['Completadas', bookings.filter(booking => booking.status === 'completada').length],
    ['Canceladas', cancellationCount],
  ] as const
  const maxStatusCount = Math.max(1, ...statusSummary.map(([, count]) => count))

  const dashboardRecent = bookings.slice(0, 8).map(booking => {
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
        repeatClients: [...customerBookings.values()].filter(customer => customer.count > 1).length,
        monthlyBookings,
        topCategories,
        topClients,
        exportCategories,
        exportClients,
        exportBookings: bookings.map(booking => {
          const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
          return {
            code: booking.code,
            createdAt: booking.created_at,
            eventDate: booking.event_date,
            eventName: booking.event_name,
            status: booking.status,
            total: booking.total,
            clientName: client?.full_name || 'Cliente',
          }
        }),
        statusSummary: statusSummary.map(([label, count]) => ({ label, count })),
        recent: dashboardRecent,
      }}
    />
  )
}
