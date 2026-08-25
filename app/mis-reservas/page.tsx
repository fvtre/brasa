import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, MapPin, PartyPopper, Users } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/format'
import { bookingStatusClasses, bookingStatusLabel } from '@/lib/booking-status'

export const dynamic = 'force-dynamic'

export default async function MisReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  const { booking } = await searchParams

  if (booking) {
    redirect(`/mis-reservas/${encodeURIComponent(booking)}`)
  }

  const { profile } = await requireRole(['cliente', 'administrador'])
  const supabase = await createClient()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,code,event_name,event_date,event_time,status,total,comuna,guests,
      items:booking_items(id,provider_name,service_name,provider_status,line_total)
    `)
    .eq('client_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold text-primary">Mi cuenta</p>
      <h1 className="mt-1 text-3xl font-extrabold">Mis reservas</h1>
      <p className="mt-2 text-muted-foreground">Tus solicitudes y estados guardados en Brasa.</p>

      {error && (
        <p className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {(bookings || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <PartyPopper className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-bold">Aún no tienes reservas</h2>
            <Link
              href="/proveedores"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Buscar prestadores
            </Link>
          </div>
        ) : (
          (bookings || []).map((booking: any) => (
            <article key={booking.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{booking.code}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${bookingStatusClasses(booking.status)}`}>
                      {bookingStatusLabel(booking.status)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold">{booking.event_name}</h2>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex gap-1"><CalendarDays size={15}/>{booking.event_date} · {booking.event_time?.slice(0,5)}</span>
                    <span className="flex gap-1"><MapPin size={15}/>{booking.comuna || 'Sin comuna'}</span>
                    <span className="flex gap-1"><Users size={15}/>{booking.guests} invitados</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total estimado</p>
                  <p className="text-xl font-bold">{formatCLP(booking.total)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
                {(booking.items || []).map((item: any) => (
                  <div key={item.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <b>{item.provider_name}</b>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${bookingStatusClasses(item.provider_status)}`}>
                        {bookingStatusLabel(item.provider_status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{item.service_name}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end border-t pt-4">
                <Link
                  href={`/mis-reservas/${encodeURIComponent(booking.code)}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
