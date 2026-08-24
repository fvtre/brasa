import Link from 'next/link'
import {
  CalendarDays,
  Heart,
  MessageCircle,
  PartyPopper,
  Plus,
  Wallet,
  MapPin,
  Clock3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/format'
import { BookingExpiryCountdown } from '@/components/booking-expiry-countdown'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type BookingRow = {
  id: string
  code: string
  event_name: string
  event_date: string
  event_time: string
  status: string
  subtotal: number
  platform_fee: number
  total: number
  comuna: string | null
  address: string
  guests: number
  created_at: string
  category_slug: string | null
}

export default async function ClientDashboard() {
  const { profile } = await requireRole([
    'cliente',
    'administrador',
  ])

  const supabase =
    await createClient()

  // ======================================================
  // RESERVAS DEL CLIENTE
  // ======================================================

  const {
    data: rpcBookings,
    error: rpcError,
  } = await supabase.rpc(
    'get_my_bookings_with_category'
  )

  let bookings =
    (rpcBookings || []) as BookingRow[]

  // Fallback temporal:
  // si la RPC todavía no existe en tu Supabase,
  // seguimos pudiendo leer directamente.
  if (rpcError) {
    console.error(
      'RPC get_my_bookings falló:',
      rpcError
    )

    const {
      data: directBookings,
      error: directError,
    } = await supabase
      .from('bookings')
      .select(`
        id,
        code,
        event_name,
        event_date,
        event_time,
        status,
        subtotal,
        platform_fee,
        total,
        comuna,
        address,
        guests,
        created_at
      `)
      .eq(
        'client_id',
        profile.id
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(30)

    if (directError) {
      console.error(
        'Error cargando reservas cliente:',
        directError
      )
    }

    bookings =
      (directBookings ||
        []) as BookingRow[]
  }

  // ======================================================
  // FAVORITOS
  // ======================================================

  const {
    count: favorites,
    error: favoritesError,
  } = await supabase
    .from('favorites')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq(
      'client_id',
      profile.id
    )

  if (favoritesError) {
    console.error(
      'Error cargando favoritos:',
      favoritesError
    )
  }

  // ======================================================
  // MÉTRICAS
  // ======================================================

  const activeBookings =
    bookings.filter(
      (booking) =>
        ![
          'completada',
          'cancelada',
          'expirada',
          'rechazada',
        ].includes(
          booking.status
        )
    )

  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        'completada'
    )

  const totalReserved =
    bookings
      .filter(
        (booking) =>
          ![
            'cancelada',
            'expirada',
            'rechazada',
          ].includes(
            booking.status
          )
      )
      .reduce(
        (
          sum,
          booking
        ) =>
          sum +
          Number(
            booking.total || 0
          ),
        0
      )
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            Cliente
          </p>

          <h1 className="mt-1 text-3xl font-extrabold">
            Hola,{' '}
            {profile.full_name ||
              'bienvenido'}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Organiza y sigue todos
            tus eventos desde aquí.
          </p>
        </div>

        <Button
          nativeButton={false}
          render={
            <Link href="/planificar" />
          }
        >
          <Plus />
          Planificar evento
        </Button>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={CalendarDays}
          label="Eventos activos"
          value={String(
            activeBookings.length
          )}
        />

        <Kpi
          icon={PartyPopper}
          label="Reservas"
          value={String(
            bookings.length
          )}
        />

        <Kpi
          icon={Heart}
          label="Favoritos"
          value={String(
            favorites || 0
          )}
        />

        <Kpi
          icon={Wallet}
          label="Total reservado"
          value={formatCLP(
            totalReserved
          )}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* RESERVAS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Mis reservas
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {bookings.length === 0 ? (
              <div className="py-12 text-center">
                <PartyPopper className="mx-auto size-9 text-muted-foreground/40" />

                <p className="mt-3 font-medium">
                  Todavía no tienes
                  reservas
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Explora prestadores
                  y arma tu primer
                  evento.
                </p>

                <Button
                  nativeButton={
                    false
                  }
                  className="mt-5"
                  render={
                    <Link href="/proveedores" />
                  }
                >
                  Explorar prestadores
                </Button>
              </div>
            ) : (
              bookings.map(
                (booking) => (
                  <div
                    key={
                      booking.id
                    }
                    className="rounded-xl border p-4 transition hover:bg-muted/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-bold">
                            {booking.event_name}
                          </h3>

                          <StatusBadge
                            status={booking.status}
                          />

                          <div className="flex items-center self-center">
                            <BookingExpiryCountdown
                              type="client"
                              bookingId={booking.id}
                              status={booking.status}
                            />
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {
                            booking.code
                          }
                        </p>


                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <span className="flex items-center gap-2">
                            <CalendarDays className="size-4" />

                            {formatDate(
                              booking.event_date
                            )}
                          </span>

                          <span className="flex items-center gap-2">
                            <Clock3 className="size-4" />

                            {booking.event_time?.slice(
                              0,
                              5
                            )}
                          </span>

                          <span className="flex items-center gap-2">
                            <MapPin className="size-4" />

                            {booking.comuna ||
                              'Sin comuna'}
                          </span>

                          <span className="flex items-center gap-2">
                            <PartyPopper className="size-4" />

                            {booking.guests ||
                              0}{' '}
                            invitados
                          </span>
                        </div>
                        {booking.status === 'expirada' && (
                          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <p className="text-sm font-semibold text-amber-700">
                              El prestador no alcanzó a responder
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Pasaron los 10 minutos de confirmación.
                              El horario fue liberado y puedes buscar
                              otro prestador para tu evento.
                            </p>

                            <Button
                              nativeButton={false}
                              size="sm"
                              variant="outline"
                              className="mt-3"
                              render={
                                <Link
                                  href={`/proveedores?date=${booking.event_date}&time=${booking.event_time?.slice(0, 5)}&guests=${booking.guests || 0}&category=${booking.category_slug || ''}`}
                                >
                                  Buscar otro prestador
                                </Link>
                              }
                            >
                              Buscar otro prestador
                              <ArrowRight className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Total
                        </p>

                        <p className="text-lg font-extrabold">
                          {formatCLP(
                            booking.total
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <div className="text-xs text-muted-foreground">
                        Subtotal{' '}
                        {formatCLP(
                          booking.subtotal
                        )}
                        {' · '}
                        Comisión{' '}
                        {formatCLP(
                          booking.platform_fee
                        )}
                      </div>

                      <Link
                        href={`/mis-reservas?booking=${booking.code}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Ver detalle
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <MessageCircle className="size-5 text-primary" />

              <h2 className="mt-3 font-bold">
                Mensajes
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Conversa con tus
                prestadores y coordina
                detalles del evento.
              </p>

              <Button
                nativeButton={
                  false
                }
                variant="outline"
                className="mt-4 w-full"
                render={
                  <Link href="/mensajes" />
                }
              >
                Ver mensajes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <CheckCircle2 className="size-5 text-primary" />

              <h2 className="mt-3 font-bold">
                Eventos completados
              </h2>

              <p className="mt-1 text-2xl font-extrabold">
                {
                  completedBookings.length
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <PartyPopper className="size-5 text-primary" />

              <h2 className="mt-3 font-bold">
                Arma otro evento
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Compara servicios y
                controla tu
                presupuesto.
              </p>

              <Button
                nativeButton={
                  false
                }
                variant="outline"
                className="mt-4 w-full"
                render={
                  <Link href="/planificar" />
                }
              >
                Comenzar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const labels: Record<
    string,
    string
  > = {
    confirmada:
      'Confirmada',

    completada:
      'Completada',

    cancelada:
      'Cancelada',

    rechazada:
      'Rechazada',

    expirada:
      'Solicitud expirada',

    esperando_confirmacion:
      'Esperando confirmación',

    pendiente:
      'Pendiente',
  }

  const label =
    labels[status] ||
    status.replaceAll(
      '_',
      ' '
    )

  const classes =
    status === 'confirmada'
      ? 'bg-emerald-500/10 text-emerald-700'
      : status === 'completada'
        ? 'bg-primary/10 text-primary'
        : status === 'expirada'
          ? 'bg-amber-500/10 text-amber-700'
          : status === 'rechazada'
            ? 'bg-destructive/10 text-destructive'
            : status === 'cancelada'
              ? 'bg-destructive/10 text-destructive'
              : status ===
                'esperando_confirmacion'
                ? 'bg-amber-500/10 text-amber-700'
                : 'bg-muted text-muted-foreground'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  )
}

function formatDate(
  value: string
) {
  if (!value) return ''

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    'es-CL',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs">
            {label}
          </span>

          <Icon className="size-4" />
        </div>

        <p className="mt-2 text-2xl font-extrabold">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}