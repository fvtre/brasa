import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Selection = {
  providerId: string
  providerName: string
  category: string
  serviceId: string
  serviceName: string
  price: number
  unit: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    await supabase.rpc('ensure_my_profile')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile?.active) {
      return NextResponse.json({ error: 'Tu cuenta está desactivada' }, { status: 403 })
    }
    if (!['cliente', 'administrador'].includes(profile?.role || '')) {
      return NextResponse.json(
        { error: 'Debes usar una cuenta cliente para reservar servicios' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const selections = (body.selections || []) as Selection[]

    if (!body.date || !body.time || !body.address || !selections.length) {
      return NextResponse.json({ error: 'Faltan datos del evento' }, { status: 400 })
    }

    const guests = Math.max(1, Number(body.guests) || 1)
    const normalized: any[] = []
    let subtotal = 0

    for (const selection of selections) {
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id,business_name')
        .eq('slug', selection.providerId)
        .maybeSingle()

      let service: any = null

      if (provider?.id) {
        const { data } = await supabase
          .from('provider_services')
          .select('id,name,price,unit,active')
          .eq('provider_id', provider.id)
          .eq('external_key', selection.serviceId)
          .maybeSingle()

        if (!data?.active) {
          return NextResponse.json(
            { error: `El servicio ${selection.serviceName} ya no está disponible.` },
            { status: 409 }
          )
        }

        service = data
      }

      // Para prestadores reales, el precio siempre se toma desde Supabase.
      // Las cards demo conservan el precio local mientras se migra todo el catálogo.
      const price = Number(service?.price ?? selection.price ?? 0)
      const unit = String(service?.unit ?? selection.unit ?? 'por evento')
      const quantity = unit.toLowerCase().includes('persona') ? guests : 1
      const lineTotal = Math.round(price * quantity)
      subtotal += lineTotal

      normalized.push({
        provider_id: provider?.id ?? null,
        service_id: service?.id ?? null,
        provider_slug: selection.providerId,
        provider_name: provider?.business_name ?? selection.providerName,
        category_slug: selection.category,
        service_external_key: selection.serviceId,
        service_name: service?.name ?? selection.serviceName,
        unit,
        unit_price: price,
        quantity,
        line_total: lineTotal,
      })
    }

    const platformFee = Math.round(subtotal * 0.08)
    const total = subtotal + platformFee

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: user.id,
        event_name: body.eventName || 'Mi evento',
        event_date: body.date,
        event_time: body.time,
        comuna: body.comuna || null,
        address: body.address,
        guests,
        budget: Math.max(0, Number(body.budget) || 0),
        subtotal,
        platform_fee: platformFee,
        total,
        status: 'pendiente',
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone || null,
        notes: body.notes || null,
      })
      .select('id,code,total,status')
      .single()

    if (bookingError) throw bookingError

    const { error: itemError } = await supabase
      .from('booking_items')
      .insert(normalized.map((item) => ({ ...item, booking_id: booking.id })))

    if (itemError) {
      await supabase.from('bookings').delete().eq('id', booking.id)
      throw itemError
    }

    return NextResponse.json({ booking })
  } catch (error: any) {
    console.error('POST /api/bookings', error)
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear la reserva' },
      { status: 500 }
    )
  }
}
