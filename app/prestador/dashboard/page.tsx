import Link from 'next/link'
import {
    CalendarClock,
    DollarSign,
    PackageCheck,
    Plus,
    Star,
    Users,
    MapPin,
    Phone,
    Mail,
} from 'lucide-react'
import { redirect } from 'next/navigation'

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
import { ProviderBookingActions } from '@/components/provider-booking-actions'
import { PushNotificationSettings } from '@/components/push-notification-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getProviderStatusPresentation(
    status: string
) {
    const normalized =
        String(status || '').toLowerCase()

    if (
        [
            'confirmada',
            'en_preparacion',
            'en_curso',
            'completada',
        ].includes(normalized)
    ) {
        return {
            label: normalized === 'confirmada'
                ? 'Confirmada'
                : normalized.replaceAll('_', ' '),
            className:
                'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        }
    }

    if (
        ['cancelada', 'rechazada'].includes(
            normalized
        )
    ) {
        return {
            label:
                normalized === 'rechazada'
                    ? 'Rechazada'
                    : 'Cancelada',
            className:
                'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400',
        }
    }

    if (normalized === 'expirada') {
        return {
            label: 'Expirada',
            className:
                'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-400',
        }
    }

    return {
        label:
            normalized.replaceAll('_', ' ') ||
            'Pendiente',
        className:
            'border-border bg-muted text-muted-foreground',
    }
}

export default async function ProviderDashboard() {
    const { profile } = await requireRole([
        'prestador',
        'administrador',
    ])

    const supabase = await createClient()

    const {
        data: provider,
        error: providerError,
    } = await supabase
        .from('service_providers')
        .select('*')
        .eq('owner_id', profile.id)
        .maybeSingle()

    if (providerError) {
        console.error(
            'Error cargando prestador:',
            providerError
        )
    }

    if (
        !provider &&
        profile.role === 'prestador'
    ) {
        redirect('/prestador/onboarding')
    }

    const providerId =
        provider?.id || null

    let services: any[] = []
    let items: any[] = []

    if (providerId) {
        // ======================================================
        // SERVICIOS
        // ======================================================

        const {
            data: servicesData,
            error: servicesError,
        } = await supabase
            .from('provider_services')
            .select('*')
            .eq('provider_id', providerId)
            .order('created_at', {
                ascending: false,
            })

        if (servicesError) {
            console.error(
                'Error cargando servicios:',
                servicesError
            )
        }

        services = servicesData || []

        // ======================================================
        // SOLICITUDES / RESERVAS DEL PRESTADOR
        // ======================================================

        const {
            data: rpcItems,
            error: rpcItemsError,
        } = await supabase.rpc(
            'get_my_provider_booking_items'
        )

        if (rpcItemsError) {
            console.error(
                'RPC get_my_provider_booking_items falló:',
                rpcItemsError
            )
        } else {
            items = (rpcItems || []).map(
                (item: any) => ({
                    id: item.item_id,
                    booking_id: item.booking_id,
                    provider_id: item.provider_id,
                    service_id: item.service_id,

                    service_name:
                        item.service_name,

                    unit:
                        item.unit,

                    unit_price:
                        Number(
                            item.unit_price || 0
                        ),

                    quantity:
                        Number(
                            item.quantity || 0
                        ),

                    line_total:
                        Number(
                            item.line_total || 0
                        ),

                    provider_status:
                        item.provider_status,

                    provider_notes:
                        item.provider_notes,

                    created_at:
                        item.created_at,

                    booking: {
                        code:
                            item.booking_code,

                        event_name:
                            item.event_name,

                        event_date:
                            item.event_date,

                        event_time:
                            item.event_time,

                        comuna:
                            item.comuna,

                        address:
                            item.address,

                        guests:
                            Number(
                                item.guests || 0
                            ),

                        total:
                            Number(
                                item.booking_total || 0
                            ),

                        status:
                            item.booking_status,

                        contact_name:
                            item.contact_name,

                        contact_email:
                            item.contact_email,

                        contact_phone:
                            item.contact_phone,

                        notes:
                            item.notes,
                    },
                })
            )
        }
    }

    const pending =
        items.filter(
            (item: any) =>
                [
                    'pendiente',
                    'esperando_confirmacion',
                ].includes(
                    item.provider_status
                )
        ).length

    const confirmed =
        items.filter(
            (item: any) =>
                [
                    'confirmada',
                    'en_preparacion',
                    'en_curso',
                ].includes(
                    item.provider_status
                )
        ).length

    const completed =
        items.filter(
            (item: any) =>
                item.provider_status ===
                'completada'
        ).length

    const revenue =
        items
            .filter(
                (item: any) =>
                    item.provider_status ===
                    'completada'
            )
            .reduce(
                (
                    sum: number,
                    item: any
                ) =>
                    sum +
                    Number(
                        item.line_total || 0
                    ),
                0
            )

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-primary">
                        Prestador
                    </p>

                    <h1 className="mt-1 text-3xl font-extrabold">
                        {provider?.business_name ||
                            'Panel de prestador'}
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        Administra solicitudes,
                        servicios y disponibilidad.
                    </p>
                </div>

                <Button
                    nativeButton={false}
                    render={
                        <Link href="/prestador/servicios" />
                    }
                >
                    <Plus />
                    Nuevo servicio
                </Button>
            </div>

            <PushNotificationSettings />

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Kpi
                    icon={CalendarClock}
                    label="Solicitudes"
                    value={String(
                        pending
                    )}
                />

                <Kpi
                    icon={PackageCheck}
                    label="Confirmadas"
                    value={String(
                        confirmed
                    )}
                />

                <Kpi
                    icon={Users}
                    label="Servicios activos"
                    value={String(
                        services.filter(
                            (service: any) =>
                                service.active
                        ).length
                    )}
                />

                <Kpi
                    icon={Star}
                    label="Rating"
                    value={Number(
                        provider?.rating || 0
                    ).toFixed(1)}
                />

                <Kpi
                    icon={DollarSign}
                    label="Ingresos completados"
                    value={formatCLP(
                        revenue
                    )}
                />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
                <Card id="solicitudes" className="scroll-mt-24">
                    <CardHeader>
                        <CardTitle>
                            Solicitudes recientes
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {items.length === 0 ? (
                            <div className="py-12 text-center">
                                <CalendarClock className="mx-auto size-9 text-muted-foreground/40" />

                                <p className="mt-3 font-medium">
                                    Aún no recibes
                                    solicitudes
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Cuando un cliente
                                    solicite uno de tus
                                    servicios aparecerá
                                    aquí.
                                </p>
                            </div>
                        ) : (
                            items.map(
                                (item: any) => {
                                    const booking =
                                        item.booking

                                    const statusPresentation =
                                        getProviderStatusPresentation(
                                            item.provider_status
                                        )

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border p-4"
                                        >
                                            <div className="flex flex-wrap justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <b>
                                                            {booking?.event_name ||
                                                                'Evento'}
                                                        </b>

                                                        <span
                                                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusPresentation.className}`}
                                                        >
                                                            {statusPresentation.label}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {booking?.code ||
                                                            'Sin código'}
                                                        {' · '}
                                                        {booking?.event_date ||
                                                            ''}
                                                        {' '}
                                                        {booking?.event_time
                                                            ?.slice(
                                                                0,
                                                                5
                                                            ) ||
                                                            ''}
                                                        {' · '}
                                                        {booking?.guests ||
                                                            0}{' '}
                                                        personas
                                                    </p>

                                                    <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 px-3 pb-3">
                                                    <p className="mt-3 font-medium">
                                                        {
                                                            item.service_name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {item.quantity}{' '}
                                                        ×{' '}
                                                        {formatCLP(
                                                            item.unit_price
                                                        )}{' '}
                                                        {item.unit}
                                                    </p>

                                                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                                        {booking?.contact_name && (
                                                            <span className="flex items-center gap-1">
                                                                <Users className="size-3.5" />
                                                                {
                                                                    booking.contact_name
                                                                }
                                                            </span>
                                                        )}

                                                        {booking?.comuna && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="size-3.5" />
                                                                {
                                                                    booking.comuna
                                                                }
                                                            </span>
                                                        )}

                                                        {booking?.contact_phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="size-3.5" />
                                                                {
                                                                    booking.contact_phone
                                                                }
                                                            </span>
                                                        )}

                                                        {booking?.contact_email && (
                                                            <span className="flex items-center gap-1 sm:col-span-2">
                                                                <Mail className="size-3.5" />
                                                                {
                                                                    booking.contact_email
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    {booking?.address && (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            Dirección:{' '}
                                                            {
                                                                booking.address
                                                            }
                                                        </p>
                                                    )}

                                                    {booking?.notes && (
                                                        <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                                                            {
                                                                booking.notes
                                                            }
                                                        </p>
                                                    )}

                                                    <div className="mt-4">
                                                        <ProviderBookingActions
                                                            itemId={
                                                                item.id
                                                            }
                                                            status={
                                                                item.provider_status
                                                            }
                                                        />
                                                    </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <b className="text-lg">
                                                        {formatCLP(
                                                            item.line_total
                                                        )}
                                                    </b>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Total servicio
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            )
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Mis servicios
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {services
                                .slice(0, 5)
                                .map(
                                    (
                                        service: any
                                    ) => (
                                        <div
                                            key={
                                                service.id
                                            }
                                            className="rounded-xl border p-3"
                                        >
                                            <div className="flex justify-between gap-2">
                                                <b className="text-sm">
                                                    {
                                                        service.name
                                                    }
                                                </b>

                                                <span className="text-xs text-muted-foreground">
                                                    {service.active
                                                        ? 'Activo'
                                                        : 'Pausado'}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-sm font-semibold text-primary">
                                                {formatCLP(
                                                    service.price
                                                )}{' '}
                                                <span className="font-normal text-muted-foreground">
                                                    {
                                                        service.unit
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                    )
                                )}

                            {services.length ===
                                0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Crea tu primer
                                        servicio para
                                        comenzar a recibir
                                        reservas.
                                    </p>
                                )}

                            <Button
                                nativeButton={
                                    false
                                }
                                variant="outline"
                                className="w-full"
                                render={
                                    <Link href="/prestador/servicios" />
                                }
                            >
                                Ver todos los
                                servicios
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="text-xs text-muted-foreground">
                                Servicios
                                completados
                            </p>

                            <p className="mt-1 text-2xl font-extrabold">
                                {completed}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
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
