'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    LoaderCircle,
    LockKeyhole,
    ShieldAlert,
    Users,
    Wallet,
} from 'lucide-react'

import { useEvent } from '@/components/event-provider'
import { useAuth } from '@/components/auth/auth-provider'
import { formatCLP } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/* =========================================================
   HELPERS
========================================================= */

function todayLocal() {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(
        now.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
        now.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatSlot(
    value: string
) {
    return value.slice(0, 5)
}

/* =========================================================
   CHECKOUT
========================================================= */

export default function CheckoutPage() {
    const router = useRouter()

    const supabase =
        React.useMemo(
            () => createClient(),
            []
        )

    const {
        user,
        profile,
        loading,
    } = useAuth()

    const {
        selections,
        total,
        guests,
        budget,
        comuna,
        setComuna,
        updateSelection,
        createBooking,
        creatingBooking,
        selectionTotal,
    } = useEvent()

    const [
        error,
        setError,
    ] = React.useState('')

    const [
        availabilityError,
        setAvailabilityError,
    ] = React.useState('')

    const [
        availableSlots,
        setAvailableSlots,
    ] = React.useState<string[]>([])

    const [
        loadingSlots,
        setLoadingSlots,
    ] = React.useState(false)

    const [inventoryAvailability, setInventoryAvailability] =
        React.useState<Record<string, number>>({})

    const [loadingInventory, setLoadingInventory] =
        React.useState(false)

    const [inventoryError, setInventoryError] =
        React.useState('')

    const [
        coveredCommunes,
        setCoveredCommunes,
    ] = React.useState<string[]>([])

    const [
        loadingCoverage,
        setLoadingCoverage,
    ] = React.useState(false)

    const [
        coverageError,
        setCoverageError,
    ] = React.useState('')

    const [
        form,
        setForm,
    ] = React.useState({
        eventName: 'Mi evento',

        date: '',

        // Ya NO usamos una hora por defecto.
        time: '',

        address: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        notes: '',
    })

    /* =======================================================
       COBERTURA COMUN DE LOS PRESTADORES SELECCIONADOS
    ======================================================= */

    React.useEffect(() => {
        const providerSlugs = Array.from(
            new Set(
                selections.map(
                    selection =>
                        selection.providerId
                )
            )
        )

        if (providerSlugs.length === 0) {
            setCoveredCommunes([])
            setCoverageError('')
            return
        }

        let cancelled = false

        async function loadCoverage() {
            setLoadingCoverage(true)
            setCoverageError('')

            const { data, error } =
                await supabase
                    .from('service_providers')
                    .select('slug,comuna,coverage')
                    .in('slug', providerSlugs)
                    .eq('active', true)

            if (cancelled) {
                return
            }

            if (error) {
                console.error(
                    'Error cargando cobertura:',
                    error
                )
                setCoveredCommunes([])
                setCoverageError(
                    'No se pudo consultar la cobertura de los prestadores.'
                )
                setLoadingCoverage(false)
                return
            }

            const providersCoverage =
                (data || []).map(row => {
                    const coverage =
                        Array.isArray(row.coverage) &&
                        row.coverage.length > 0
                            ? row.coverage
                            : row.comuna
                                ? [row.comuna]
                                : []

                    return new Map(
                        coverage.map(item => [
                            String(item)
                                .trim()
                                .toLocaleLowerCase('es-CL'),
                            String(item).trim(),
                        ])
                    )
                })

            const common =
                providersCoverage.length === 0
                    ? []
                    : Array.from(
                        providersCoverage[0].entries()
                    )
                        .filter(([normalized]) =>
                            providersCoverage.every(
                                coverage =>
                                    coverage.has(normalized)
                            )
                        )
                        .map(([, label]) => label)
                        .sort((a, b) =>
                            a.localeCompare(b, 'es-CL')
                        )

            setCoveredCommunes(common)

            if (
                comuna &&
                !common.some(
                    item =>
                        item.toLocaleLowerCase('es-CL') ===
                        comuna.toLocaleLowerCase('es-CL')
                )
            ) {
                setComuna(undefined)
            }

            setLoadingCoverage(false)
        }

        loadCoverage()

        return () => {
            cancelled = true
        }
    }, [
        selections,
        supabase,
    ])

    /* =======================================================
       COMPLETAR DATOS DEL CLIENTE
    ======================================================= */

    React.useEffect(() => {
        if (!profile) {
            return
        }

        setForm(
            current => ({
                ...current,

                contactName:
                    current.contactName ||
                    profile.full_name ||
                    '',

                contactEmail:
                    current.contactEmail ||
                    profile.email ||
                    '',

                contactPhone:
                    current.contactPhone ||
                    profile.phone ||
                    '',
            })
        )
    }, [profile])

    /* =======================================================
       ITEMS PARA MOTOR DE DISPONIBILIDAD
    ======================================================= */

    const availabilityItems =
        React.useMemo(
            () =>
                selections.map(
                    selection => ({
                        providerSlug:
                            selection.providerId,

                        serviceKey:
                            selection.serviceId,

                        guests,
                    })
                ),
            [guests, selections]
        )

    React.useEffect(() => {
        let cancelled = false

        const inventorySelections = selections.filter(
            selection =>
                String(selection.unit).trim().toLowerCase() === 'por unidad'
        )

        if (!form.date || !form.time || inventorySelections.length === 0) {
            setInventoryAvailability({})
            setInventoryError('')
            setLoadingInventory(false)
            return
        }

        setLoadingInventory(true)
        setInventoryError('')

        Promise.all(
            inventorySelections.map(async selection => {
                const { data, error: rpcError } = await supabase.rpc(
                    'get_available_service_inventory',
                    {
                        p_service_id: selection.serviceId,
                        p_event_date: form.date,
                        p_event_time: form.time,
                        p_guests: guests,
                    }
                )

                if (rpcError) throw rpcError

                if (data == null) return null

                return [
                    `${selection.providerId}:${selection.serviceId}`,
                    Math.max(0, Math.floor(Number(data))),
                ] as const
            })
        )
            .then(entries => {
                if (!cancelled) {
                    setInventoryAvailability(
                        Object.fromEntries(
                            entries.flatMap(entry =>
                                entry == null ? [] : [entry]
                            )
                        )
                    )
                }
            })
            .catch(err => {
                console.error('Error consultando inventario:', err)
                if (!cancelled) {
                    setInventoryAvailability({})
                    setInventoryError(
                        'No se pudo validar el stock disponible. Intenta nuevamente.'
                    )
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingInventory(false)
            })

        return () => {
            cancelled = true
        }
    }, [form.date, form.time, guests, selections, supabase])

    /* =======================================================
     BUSCAR HORARIOS REALES
  ======================================================= */

    const loadAvailableSlots =
        React.useCallback(
            async (
                resetSelectedTime = false
            ) => {
                /*
                 * Sin fecha o sin servicios
                 * no consultamos Supabase.
                 */
                if (
                    !form.date ||
                    selections.length === 0
                ) {
                    setAvailableSlots([])
                    setAvailabilityError('')

                    if (resetSelectedTime) {
                        setForm(
                            current => ({
                                ...current,
                                time: '',
                            })
                        )
                    }

                    return
                }

                setLoadingSlots(true)
                setAvailabilityError('')

                try {
                    const {
                        data,
                        error: rpcError,
                    } = await supabase.rpc(
                        'get_common_available_slots',
                        {
                            p_event_date:
                                form.date,

                            p_items:
                                availabilityItems,
                        }
                    )

                    if (rpcError) {
                        throw rpcError
                    }

                    const slots =
                        (data || [])
                            .map(
                                (row: any) =>
                                    String(
                                        row.slot_time ||
                                        ''
                                    )
                            )
                            .filter(Boolean)

                    setAvailableSlots(
                        slots
                    )

                    /*
                     * IMPORTANTE:
                     *
                     * En refrescos automáticos NO borramos
                     * la hora elegida si sigue disponible.
                     *
                     * Si otro cliente tomó esa hora,
                     * entonces sí la quitamos.
                     */
                    setForm(current => {
                        if (
                            resetSelectedTime
                        ) {
                            return {
                                ...current,
                                time: '',
                            }
                        }

                        if (
                            current.time &&
                            !slots.some(
                                (slot: string) =>
                                    formatSlot(
                                        slot
                                    ) ===
                                    formatSlot(
                                        current.time
                                    )
                            )
                        ) {
                            return {
                                ...current,
                                time: '',
                            }
                        }

                        return current
                    })

                    if (
                        slots.length === 0
                    ) {
                        setAvailabilityError(
                            'Los prestadores seleccionados no tienen un horario común disponible para esta fecha.'
                        )
                    }

                } catch (err: any) {
                    console.error(
                        'Error consultando disponibilidad:',
                        err
                    )

                    setAvailableSlots([])

                    setAvailabilityError(
                        err?.message ||
                        'No se pudo consultar la disponibilidad.'
                    )

                } finally {
                    setLoadingSlots(false)
                }
            },
            [
                form.date,
                selections.length,
                availabilityItems,
                supabase,
            ]
        )


    /* =======================================================
       CARGA INICIAL / CAMBIO DE FECHA
    ======================================================= */

    React.useEffect(() => {
        loadAvailableSlots(true)
    }, [loadAvailableSlots])


    /* =======================================================
       REFRESCO AUTOMÁTICO DE DISPONIBILIDAD
  
       Cada 30 segundos volvemos a consultar Supabase.
       Así aparecen automáticamente horarios liberados
       por expiración.
    ======================================================= */

    React.useEffect(() => {
        if (
            !form.date ||
            selections.length === 0
        ) {
            return
        }

        const interval =
            window.setInterval(
                () => {
                    loadAvailableSlots(false)
                },
                30000
            )

        return () => {
            window.clearInterval(
                interval
            )
        }
    }, [
        form.date,
        selections.length,
        loadAvailableSlots,
    ])

    /* =======================================================
       SIN SERVICIOS
    ======================================================= */

    if (
        selections.length === 0
    ) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-20 text-center">
                <h1 className="text-2xl font-bold">
                    Aún no agregas servicios
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Elige prestadores antes de
                    confirmar tu evento.
                </p>

                <Link
                    className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    href="/proveedores"
                >
                    Explorar prestadores
                </Link>
            </div>
        )
    }

    /* =======================================================
       NO AUTENTICADO
    ======================================================= */

    if (
        !loading &&
        !user
    ) {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <LockKeyhole />
                </div>

                <h1 className="mt-4 text-2xl font-bold">
                    Inicia sesión para reservar
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Tu evento ya está armado. Al
                    iniciar sesión conservarás la
                    selección en este navegador.
                </p>

                <div className="mt-6 flex justify-center gap-2">
                    <Button
                        nativeButton={false}
                        render={
                            <Link href="/login?next=/checkout" />
                        }
                    >
                        Entrar
                    </Button>

                    <Button
                        nativeButton={false}
                        variant="outline"
                        render={
                            <Link href="/registro" />
                        }
                    >
                        Crear cuenta
                    </Button>
                </div>
            </div>
        )
    }

    /* =======================================================
       PRESTADOR BLOQUEADO
    ======================================================= */

    if (
        !loading &&
        user &&
        profile?.role ===
        'prestador'
    ) {
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <ShieldAlert />
                </div>

                <h1 className="mt-4 text-2xl font-bold">
                    Esta sección es para clientes
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Como prestador puedes administrar
                    tus servicios, disponibilidad y
                    solicitudes desde tu panel.
                </p>

                <Button
                    className="mt-6"
                    nativeButton={false}
                    render={
                        <Link href="/prestador/dashboard" />
                    }
                >
                    Ir a mi negocio
                </Button>
            </div>
        )
    }

    /* =======================================================
       ENVIAR RESERVA
    ======================================================= */

    async function submit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        if (
            !user ||
            creatingBooking
        ) {
            return
        }

        setError('')

        try {
            if (
                profile?.role ===
                'prestador'
            ) {
                throw new Error(
                    'Los prestadores no pueden crear reservas como clientes.'
                )
            }

            if (!comuna) {
                throw new Error(
                    'Selecciona la comuna del evento.'
                )
            }

            if (!form.date) {
                throw new Error(
                    'Selecciona la fecha del evento.'
                )
            }

            if (!form.time) {
                throw new Error(
                    'Selecciona uno de los horarios disponibles.'
                )
            }

            /*
             * La hora debe seguir existiendo
             * dentro de la lista recibida.
             */
            if (
                !availableSlots.some(
                    slot =>
                        formatSlot(slot) ===
                        formatSlot(form.time)
                )
            ) {
                throw new Error(
                    'El horario seleccionado ya no está disponible. Selecciona otro.'
                )
            }

            const result =
                await createBooking({
                    eventName:
                        form.eventName,

                    date:
                        form.date,

                    time:
                        form.time,

                    address:
                        form.address,

                    contactName:
                        form.contactName,

                    contactEmail:
                        form.contactEmail,

                    contactPhone:
                        form.contactPhone,

                    notes:
                        form.notes,
                })

            window.location.assign(
                `/cliente/dashboard?created=${encodeURIComponent(
                    result.code
                )}`
            )

            router.refresh()
        } catch (err: any) {
            console.error(
                'Error confirmando reserva:',
                err
            )

            setError(
                err?.message ||
                'No se pudo crear la reserva.'
            )
        }
    }

    /* =======================================================
       TOTALES
    ======================================================= */

    const fee =
        Math.round(
            total * 0.08
        )

    const totalWithFee =
        total + fee

    const overBudget =
        budget > 0 &&
        totalWithFee >
        budget

    const remaining =
        budget -
        totalWithFee

    const canSubmit =
        !!form.date &&
        !!form.time &&
        !loadingSlots &&
        !loadingInventory &&
        !inventoryError &&
        !selections.some(selection => {
            const available = inventoryAvailability[
                `${selection.providerId}:${selection.serviceId}`
            ]

            return available != null &&
                Number(selection.quantity || 1) > available
        }) &&
        !creatingBooking &&
        availableSlots.length > 0

    /* =======================================================
       UI
    ======================================================= */

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">

            {/* HEADER */}

            <div className="mb-8">
                <p className="text-sm font-semibold text-primary">
                    Confirmación
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                    Reserva tu evento
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Confirma los datos y selecciona
                    un horario disponible para todos
                    los prestadores.
                </p>
            </div>

            <form
                onSubmit={submit}
                className="grid gap-8 lg:grid-cols-[1fr_360px]"
            >

                {/* ===============================================
            DATOS EVENTO
        =============================================== */}

                <div className="space-y-6 rounded-2xl border bg-card p-6">

                    {/* NOMBRE + COMUNA */}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm">
                            <span>
                                Nombre del evento
                            </span>

                            <Input
                                required
                                disabled={
                                    creatingBooking
                                }
                                value={
                                    form.eventName
                                }
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        eventName:
                                            e.target.value,
                                    })
                                }
                            />
                        </label>

                        <label className="space-y-1.5 text-sm">
                            <span>
                                Comuna
                            </span>

                            <select
                                required
                                disabled={
                                    creatingBooking ||
                                    loadingCoverage ||
                                    coveredCommunes.length === 0
                                }
                                value={
                                    comuna || ''
                                }
                                onChange={e =>
                                    setComuna(
                                        e.target.value ||
                                        undefined
                                    )
                                }
                                className="h-10 w-full rounded-lg border border-border bg-background px-3"
                            >
                                <option value="">
                                    {loadingCoverage
                                        ? 'Cargando cobertura…'
                                        : coveredCommunes.length === 0
                                            ? 'Sin comunas compatibles'
                                            : 'Selecciona'}
                                </option>

                                {coveredCommunes.map(
                                    item => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </select>

                            {!loadingCoverage &&
                                coveredCommunes.length > 0 && (
                                    <span className="block text-xs text-muted-foreground">
                                        Comunas atendidas por todos los prestadores seleccionados.
                                    </span>
                                )}

                            {!loadingCoverage &&
                                coveredCommunes.length === 0 &&
                                selections.length > 0 && (
                                    <span className="block text-xs text-destructive">
                                        Los prestadores seleccionados no comparten una comuna de cobertura.
                                    </span>
                                )}

                            {coverageError && (
                                <span className="block text-xs text-destructive">
                                    {coverageError}
                                </span>
                            )}
                        </label>
                    </div>

                    {/* =============================================
              FECHA
          ============================================= */}

                    <div>
                        <label className="space-y-1.5 text-sm">
                            <span className="flex items-center gap-2">
                                <CalendarDays
                                    size={15}
                                />

                                Fecha del evento
                            </span>

                            <Input
                                required
                                type="date"
                                min={
                                    todayLocal()
                                }
                                disabled={
                                    creatingBooking
                                }
                                value={
                                    form.date
                                }
                                onChange={e => {
                                    setForm({
                                        ...form,
                                        date:
                                            e.target.value,

                                        /*
                                         * Cambiar fecha siempre
                                         * invalida hora.
                                         */
                                        time: '',
                                    })

                                    setError('')
                                    setAvailabilityError('')
                                }}
                            />
                        </label>
                    </div>

                    {/* =============================================
              HORARIOS REALES
          ============================================= */}

                    <div className="rounded-xl border bg-muted/20 p-4">

                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Clock3
                                    size={17}
                                />
                            </span>

                            <div>
                                <p className="font-semibold">
                                    Horarios disponibles
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Brasa muestra únicamente
                                    horarios compatibles con
                                    todos los prestadores de
                                    tu evento.
                                </p>
                            </div>
                        </div>

                        {/* SIN FECHA */}

                        {!form.date && (
                            <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                Selecciona primero una fecha.
                            </div>
                        )}

                        {/* CARGANDO */}

                        {form.date &&
                            loadingSlots && (
                                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                                    <LoaderCircle className="size-4 animate-spin" />

                                    Consultando disponibilidad...
                                </div>
                            )}

                        {/* ERROR / SIN DISPONIBILIDAD */}

                        {form.date &&
                            !loadingSlots &&
                            availabilityError && (
                                <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                                    {
                                        availabilityError
                                    }
                                </div>
                            )}

                        {/* SLOTS */}

                        {form.date &&
                            !loadingSlots &&
                            availableSlots.length >
                            0 && (
                                <>
                                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                        {availableSlots.map(
                                            slot => {
                                                const display =
                                                    formatSlot(
                                                        slot
                                                    )

                                                const selected =
                                                    formatSlot(
                                                        form.time
                                                    ) ===
                                                    display

                                                return (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        disabled={
                                                            creatingBooking
                                                        }
                                                        onClick={() => {
                                                            setForm({
                                                                ...form,
                                                                time:
                                                                    display,
                                                            })

                                                            setError('')
                                                        }}
                                                        className={cn(
                                                            'rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all',
                                                            selected
                                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                                : 'border-border bg-background hover:border-primary hover:bg-primary/5'
                                                        )}
                                                    >
                                                        {display}
                                                    </button>
                                                )
                                            }
                                        )}
                                    </div>

                                    {form.time && (
                                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm">
                                            <CheckCircle2 className="size-4 text-primary" />

                                            <span>
                                                Horario seleccionado:{' '}
                                                <b>
                                                    {form.time}
                                                </b>
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                    </div>

                    {/* DIRECCIÓN */}

                    <label className="space-y-1.5 text-sm">
                        <span>
                            Dirección
                        </span>

                        <Input
                            required
                            disabled={
                                creatingBooking
                            }
                            value={
                                form.address
                            }
                            onChange={e =>
                                setForm({
                                    ...form,
                                    address:
                                        e.target.value,
                                })
                            }
                            placeholder="Ej: Av. Siempre Viva 123"
                        />
                    </label>

                    {/* CONTACTO */}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm">
                            <span>
                                Nombre contacto
                            </span>

                            <Input
                                required
                                disabled={
                                    creatingBooking
                                }
                                value={
                                    form.contactName
                                }
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        contactName:
                                            e.target.value,
                                    })
                                }
                            />
                        </label>

                        <label className="space-y-1.5 text-sm">
                            <span>
                                Teléfono
                            </span>

                            <Input
                                disabled={
                                    creatingBooking
                                }
                                value={
                                    form.contactPhone
                                }
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        contactPhone:
                                            e.target.value,
                                    })
                                }
                                placeholder="+56 9..."
                            />
                        </label>
                    </div>

                    {/* EMAIL */}

                    <label className="space-y-1.5 text-sm">
                        <span>
                            Email
                        </span>

                        <Input
                            required
                            type="email"
                            disabled={
                                creatingBooking
                            }
                            value={
                                form.contactEmail
                            }
                            onChange={e =>
                                setForm({
                                    ...form,
                                    contactEmail:
                                        e.target.value,
                                })
                            }
                        />
                    </label>

                    {/* NOTAS */}

                    <label className="space-y-1.5 text-sm">
                        <span>
                            Notas para los prestadores
                        </span>

                        <Textarea
                            disabled={
                                creatingBooking
                            }
                            rows={5}
                            value={
                                form.notes
                            }
                            onChange={e =>
                                setForm({
                                    ...form,
                                    notes:
                                        e.target.value,
                                })
                            }
                            placeholder="Acceso, estacionamiento, restricciones, instrucciones especiales, etc."
                        />
                    </label>

                    {/* ERROR */}

                    {error && (
                        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>

                {/* ===============================================
            RESUMEN
        =============================================== */}

                <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">

                    <div className="rounded-2xl border bg-muted/30 p-5">
                        <h2 className="font-bold">
                            Resumen
                        </h2>

                        <div className="mt-4 space-y-3 text-sm">

                            {/* INVITADOS */}

                            <p className="flex justify-between">
                                <span className="flex gap-2 text-muted-foreground">
                                    <Users
                                        size={15}
                                    />

                                    Invitados
                                </span>

                                <b>
                                    {guests}
                                </b>
                            </p>

                            {/* PRESUPUESTO */}

                            <p className="flex justify-between">
                                <span className="flex gap-2 text-muted-foreground">
                                    <Wallet
                                        size={15}
                                    />

                                    Presupuesto
                                </span>

                                <b>
                                    {formatCLP(
                                        budget
                                    )}
                                </b>
                            </p>

                            {/* FECHA */}

                            {form.date && (
                                <p className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Fecha
                                    </span>

                                    <b>
                                        {form.date}
                                    </b>
                                </p>
                            )}

                            {/* HORA */}

                            {form.time && (
                                <p className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Hora
                                    </span>

                                    <b>
                                        {form.time}
                                    </b>
                                </p>
                            )}

                            {/* SERVICIOS */}

                            <p className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Servicios
                                </span>

                                <b>
                                    {
                                        selections.length
                                    }
                                </b>
                            </p>

                            {/* =========================================
                  DESGLOSE
              ========================================== */}

                            <div className="space-y-3 border-y py-3">
                                {selections.map(
                                    selection => {
                                        const serviceTotal =
                                            selectionTotal(
                                                selection
                                            )

                                        const inventoryKey =
                                            `${selection.providerId}:${selection.serviceId}`
                                        const availableInventory =
                                            inventoryAvailability[inventoryKey]
                                        const isPerUnit =
                                            String(selection.unit).trim().toLowerCase() === 'por unidad'
                                        const hasInventoryControl =
                                            isPerUnit &&
                                            (selection.scheduleMode === 'delivery_pickup' ||
                                                availableInventory != null) &&
                                            (selection.inventoryCapacity != null ||
                                                availableInventory != null)
                                        const selectedQuantity = Math.max(
                                            1,
                                            Math.floor(Number(selection.quantity || 1))
                                        )
                                        const insufficientInventory =
                                            availableInventory != null &&
                                            selectedQuantity > availableInventory

                                        return (
                                            <div
                                                key={`${selection.providerId}-${selection.serviceId}`}
                                                className="space-y-1"
                                            >
                                                <div className="flex justify-between gap-3 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {
                                                                selection.serviceName
                                                            }
                                                        </p>

                                                        <p className="truncate text-muted-foreground">
                                                            {
                                                                selection.providerName
                                                            }
                                                        </p>
                                                    </div>

                                                    <span className="shrink-0 font-semibold">
                                                        {formatCLP(
                                                            serviceTotal
                                                        )}
                                                    </span>
                                                </div>

                                                {isPerUnit && (
                                                    <div className="mt-2 rounded-lg border bg-background/70 p-2">
                                                        <div className="flex items-center justify-between gap-3 text-xs">
                                                            <label htmlFor={`checkout-quantity-${selection.serviceId}`}>
                                                                Cantidad
                                                            </label>
                                                            <input
                                                                id={`checkout-quantity-${selection.serviceId}`}
                                                                type="number"
                                                                min={1}
                                                                max={availableInventory ?? selection.inventoryCapacity ?? undefined}
                                                                step={1}
                                                                value={selectedQuantity}
                                                                disabled={creatingBooking || loadingInventory}
                                                                onChange={event => {
                                                                    const requested = Math.max(
                                                                        1,
                                                                        Math.floor(Number(event.target.value) || 1)
                                                                    )
                                                                    const maximum =
                                                                        availableInventory ??
                                                                        selection.inventoryCapacity ??
                                                                        requested

                                                                    updateSelection(
                                                                        selection.serviceId,
                                                                        selection.providerId,
                                                                        { quantity: Math.min(requested, maximum) }
                                                                    )
                                                                }}
                                                                className="h-8 w-20 rounded-md border bg-background px-2 text-right font-semibold outline-none focus:border-primary"
                                                            />
                                                        </div>

                                                        {hasInventoryControl && form.time && (
                                                            <p className={cn(
                                                                'mt-1 text-[11px]',
                                                                insufficientInventory
                                                                    ? 'font-medium text-destructive'
                                                                    : 'text-muted-foreground'
                                                            )}>
                                                                {loadingInventory
                                                                    ? 'Validando stock...'
                                                                    : availableInventory != null
                                                                        ? `Máximo disponible para este horario: ${availableInventory}`
                                                                        : 'Stock pendiente de validación.'}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* EXTRAS ELEGIDOS */}

                                                <div className="space-y-0.5 pl-2 text-[11px] text-muted-foreground">

                                                    {selection.fullPackage ? (
                                                        <p className="text-primary">
                                                            Full Brasa aplicado
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {selection.wantsGrill && (
                                                                <p>
                                                                    + Parrilla
                                                                </p>
                                                            )}

                                                            {selection.wantsTransport && (
                                                                <p>
                                                                    + Traslado
                                                                </p>
                                                            )}

                                                            {selection.wantsShopping && (
                                                                <p>
                                                                    + Gestión de compras
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    }
                                )}
                            </div>

                            {/* SUBTOTAL */}

                            <p className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Subtotal
                                </span>

                                <b>
                                    {formatCLP(
                                        total
                                    )}
                                </b>
                            </p>

                            {/* COMISIÓN */}

                            <p className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Comisión plataforma (8%)
                                </span>

                                <b>
                                    {formatCLP(
                                        fee
                                    )}
                                </b>
                            </p>

                            {/* TOTAL */}

                            <div className="border-t pt-3">
                                <p className="flex justify-between text-base">
                                    <span>
                                        Total estimado
                                    </span>

                                    <b>
                                        {formatCLP(
                                            totalWithFee
                                        )}
                                    </b>
                                </p>
                            </div>

                            {/* PRESUPUESTO */}

                            {budget > 0 && (
                                <div
                                    className={
                                        overBudget
                                            ? 'rounded-lg bg-destructive/10 p-3 text-xs text-destructive'
                                            : 'rounded-lg bg-primary/10 p-3 text-xs text-primary'
                                    }
                                >
                                    {overBudget
                                        ? `Superas tu presupuesto en ${formatCLP(
                                            Math.abs(
                                                remaining
                                            )
                                        )}.`
                                        : `Te quedan ${formatCLP(
                                            remaining
                                        )} disponibles.`}
                                </div>
                            )}
                        </div>

                        {/* INFO */}

                        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
                            <CheckCircle2 className="mr-2 inline size-4 text-primary" />

                            El horario se valida nuevamente
                            al confirmar la solicitud.
                        </div>

                        {inventoryError && (
                            <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                                {inventoryError}
                            </div>
                        )}

                        {/* CONFIRMAR */}

                        <Button
                            type="submit"
                            className="mt-4 h-11 w-full"
                            disabled={
                                !canSubmit
                            }
                        >
                            {creatingBooking ? (
                                <LoaderCircle className="animate-spin" />
                            ) : (
                                <CreditCard />
                            )}

                            {creatingBooking
                                ? 'Creando reserva...'
                                : !form.date
                                    ? 'Selecciona una fecha'
                                    : loadingSlots
                                        ? 'Consultando horarios...'
                                        : !form.time
                                            ? 'Selecciona un horario'
                                            : 'Confirmar solicitud'}
                        </Button>
                    </div>
                </aside>
            </form>
        </div>
    )
}
