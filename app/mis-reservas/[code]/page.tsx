import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  PartyPopper,
  Users,
} from 'lucide-react'

import { requireRole } from '@/lib/auth'
import { formatCLP } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { getCategory } from '@/lib/catalog'
import { bookingStatusClasses, bookingStatusLabel } from '@/lib/booking-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  await requireRole(['cliente', 'administrador'])
  const { code } = await params
  const supabase = await createClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id, code, event_name, event_date, event_time, status,
      comuna, address, guests, budget, subtotal, platform_fee,
      total, contact_name, contact_email, contact_phone, notes,
      created_at,
      items:booking_items(
        id, provider_slug, provider_name, category_slug,
        service_name, unit, unit_price, quantity, line_total,
        provider_status, provider_notes, expires_at,
        provider:service_providers!booking_items_provider_id_fkey(
          image_url,
          categories:provider_categories(category_slug, cover_image_url)
        )
      )
    `)
    .eq('code', decodeURIComponent(code))
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!booking) {
    notFound()
  }

  const items = (booking.items || []) as any[]

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/mis-reservas"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Volver a mis reservas
      </Link>

      <section className="mt-5 rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {booking.code}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bookingStatusClasses(booking.status)}`}>
                {bookingStatusLabel(booking.status)}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-primary">Detalle de la reserva</p>
            <h1 className="mt-1 text-3xl font-extrabold">{booking.event_name}</h1>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-extrabold">{formatCLP(booking.total)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <span className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />{formatDate(booking.event_date)}</span>
          <span className="flex items-center gap-2"><Clock3 className="size-4 text-primary" />{booking.event_time?.slice(0, 5)}</span>
          <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{booking.comuna || 'Sin comuna'}</span>
          <span className="flex items-center gap-2"><Users className="size-4 text-primary" />{booking.guests} invitados</span>
        </div>

        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          <p><span className="font-semibold">Dirección:</span> {booking.address}</p>
          {booking.notes && <p className="mt-2"><span className="font-semibold">Notas:</span> {booking.notes}</p>}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-2">
          <PartyPopper className="size-5 text-primary" />
          <h2 className="text-xl font-bold">Servicios contratados</h2>
        </div>

        <div className="mt-4 space-y-4">
          {items.map(item => {
            const provider = Array.isArray(item.provider) ? item.provider[0] : item.provider
            const categories = Array.isArray(provider?.categories) ? provider.categories : []
            const categoryProfile = categories.find(
              (category: any) => category.category_slug === item.category_slug
            )
            const providerImage =
              categoryProfile?.cover_image_url ||
              provider?.image_url ||
              getCategory(item.category_slug)?.image ||
              '/placeholder.jpg'

            return (
            <article key={item.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="relative h-44 w-full bg-muted sm:h-52">
                <Image
                  src={providerImage}
                  alt={`${item.provider_name} · ${item.category_slug}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 960px"
                />
              </div>
              <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{item.provider_name}</h3>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${bookingStatusClasses(item.provider_status)}`}>
                      {bookingStatusLabel(item.provider_status)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{item.service_name}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {String(item.category_slug).replaceAll('-', ' ')} · {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {Number(item.quantity) !== 1
                      ? `${item.quantity} × ${formatCLP(item.unit_price)}`
                      : 'Precio del servicio'}
                  </p>
                  <p className="text-lg font-bold">{formatCLP(item.line_total)}</p>
                </div>
              </div>

              {item.provider_notes && (
                <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="font-semibold">Mensaje del prestador:</span>{' '}
                  {item.provider_notes}
                </p>
              )}

              </div>
            </article>
            )
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Datos de contacto</h2>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p>{booking.contact_name}</p>
            <p>{booking.contact_email}</p>
            {booking.contact_phone && <p>{booking.contact_phone}</p>}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Resumen de pago</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatCLP(booking.subtotal)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Comisión Brasa</dt><dd>{formatCLP(booking.platform_fee)}</dd></div>
            <div className="flex justify-between gap-4 border-t pt-2 font-bold"><dt>Total</dt><dd>{formatCLP(booking.total)}</dd></div>
          </dl>
        </div>
      </section>
    </main>
  )
}
