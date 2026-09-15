import { AdminBookingManager, type AdminBooking } from '@/components/admin-booking-manager'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminBookingsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('bookings').select(`
    id,code,event_name,event_date,event_time,status,total,
    client:profiles!bookings_client_id_fkey(full_name,email),
    items:booking_items(id,provider_name,service_name,provider_status,line_total),
    payments(status,amount,authorized_at)
  `).order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const bookings = (data || []).map(row => ({
    ...row,
    client: Array.isArray(row.client) ? row.client[0] || null : row.client,
  })) as unknown as AdminBooking[]

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-semibold text-primary">Administración</p>
      <h1 className="mt-1 text-3xl font-extrabold">Reservas</h1>
      <p className="mt-2 text-muted-foreground">Confirma incidencias, cancela reservas o marca servicios completados sin borrar el historial financiero.</p>
      <AdminBookingManager bookings={bookings} />
    </main>
  )
}
