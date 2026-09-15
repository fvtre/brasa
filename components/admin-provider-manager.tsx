'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, ExternalLink, Save, Trash2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Availability = {
  id: string
  provider_id: string
  category_slug: string | null
  date: string
  start_time: string | null
  end_time: string | null
  available: boolean
  notes: string | null
}

type Service = {
  id: string
  name: string
  category_slug: string
  price: number
  unit: string
  active: boolean
}

type Provider = {
  id: string
  slug: string | null
  business_name: string
  tagline: string | null
  bio: string | null
  comuna: string | null
  region: string | null
  experience_years: number
  verified: boolean
  featured: boolean
  active: boolean
}

const fieldClass = 'h-10 rounded-lg border border-input bg-background px-3 text-sm'

export function AdminProviderManager({
  initialProvider,
  categories,
  initialServices,
  initialAvailability,
}: {
  initialProvider: Provider
  categories: string[]
  initialServices: Service[]
  initialAvailability: Availability[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [provider, setProvider] = useState(initialProvider)
  const [services, setServices] = useState(initialServices)
  const [availability, setAvailability] = useState(initialAvailability)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [newSlot, setNewSlot] = useState({
    category_slug: categories[0] || '',
    date: new Date().toISOString().slice(0, 10),
    start_time: '08:00',
    end_time: '23:00',
    notes: '',
  })

  function beginAction() {
    setMessage('')
    setError('')
    setSaving(true)
  }

  function finishAction(text: string) {
    setMessage(text)
    setSaving(false)
  }

  function failAction(cause: unknown) {
    setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.')
    setSaving(false)
  }

  async function patchProvider(field: 'verified' | 'featured' | 'active') {
    beginAction()
    const value = !provider[field]
    const { error: updateError } = await supabase
      .from('service_providers')
      .update({ [field]: value })
      .eq('id', provider.id)

    if (updateError) return failAction(updateError)
    setProvider(current => ({ ...current, [field]: value }))
    finishAction('Perfil actualizado.')
  }

  async function saveProviderProfile() {
    beginAction()
    const { error: updateError } = await supabase.from('service_providers').update({
      business_name: provider.business_name.trim(),
      tagline: provider.tagline?.trim() || null,
      bio: provider.bio?.trim() || null,
      comuna: provider.comuna?.trim() || null,
      region: provider.region?.trim() || null,
      experience_years: Number(provider.experience_years) || 0,
    }).eq('id', provider.id)

    if (updateError) return failAction(updateError)
    finishAction('Datos del negocio actualizados.')
  }

  async function toggleService(service: Service) {
    beginAction()
    const { error: updateError } = await supabase
      .from('provider_services')
      .update({ active: !service.active })
      .eq('id', service.id)

    if (updateError) return failAction(updateError)
    setServices(current => current.map(row => row.id === service.id ? { ...row, active: !row.active } : row))
    finishAction('Servicio actualizado.')
  }

  async function createSlot() {
    beginAction()
    try {
      if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
        throw new Error('Completa fecha, hora de inicio y hora de término.')
      }
      if (newSlot.start_time >= newSlot.end_time) {
        throw new Error('La hora de término debe ser posterior al inicio.')
      }

      const { data, error: insertError } = await supabase
        .from('provider_availability')
        .insert({
          provider_id: provider.id,
          category_slug: newSlot.category_slug || null,
          date: newSlot.date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          available: true,
          notes: newSlot.notes || null,
        })
        .select('id,provider_id,category_slug,date,start_time,end_time,available,notes')
        .single()

      if (insertError) throw insertError
      setAvailability(current => [...current, data].sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)))
      finishAction('Bloque agregado a la agenda.')
    } catch (cause) {
      failAction(cause)
    }
  }

  function editSlot(id: string, patch: Partial<Availability>) {
    setAvailability(current => current.map(row => row.id === id ? { ...row, ...patch } : row))
  }

  async function saveSlot(slot: Availability) {
    beginAction()
    try {
      if (!slot.date || !slot.start_time || !slot.end_time || slot.start_time >= slot.end_time) {
        throw new Error('Revisa la fecha y el rango horario.')
      }
      const { error: updateError } = await supabase
        .from('provider_availability')
        .update({
          category_slug: slot.category_slug || null,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          available: slot.available,
          notes: slot.notes || null,
        })
        .eq('id', slot.id)

      if (updateError) throw updateError
      finishAction('Agenda actualizada.')
    } catch (cause) {
      failAction(cause)
    }
  }

  async function removeSlot(slot: Availability) {
    if (!window.confirm(`¿Eliminar el bloque del ${slot.date}?`)) return
    beginAction()
    const { error: deleteError } = await supabase
      .from('provider_availability')
      .delete()
      .eq('id', slot.id)

    if (deleteError) return failAction(deleteError)
    setAvailability(current => current.filter(row => row.id !== slot.id))
    finishAction('Bloque eliminado.')
  }

  return (
    <div className="mt-8 space-y-6">
      {(message || error) && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${error ? 'border-red-500/30 bg-red-500/10 text-red-700' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Control del perfil</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant={provider.verified ? 'default' : 'outline'} disabled={saving} onClick={() => patchProvider('verified')}>
            {provider.verified ? 'Verificado' : 'Marcar verificado'}
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => patchProvider('featured')}>
            {provider.featured ? 'Quitar destacado' : 'Destacar'}
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => patchProvider('active')}>
            {provider.active ? 'Desactivar marketplace' : 'Reactivar marketplace'}
          </Button>
          {provider.slug && (
            <Button nativeButton={false} variant="outline" render={<a href={`/proveedores/${provider.slug}`} target="_blank" rel="noreferrer" />}>
              <ExternalLink /> Ver perfil público
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Editar datos del negocio</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">Nombre del negocio<Input value={provider.business_name} onChange={event => setProvider(current => ({ ...current, business_name: event.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Comuna<Input value={provider.comuna || ''} onChange={event => setProvider(current => ({ ...current, comuna: event.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Región<Input value={provider.region || ''} onChange={event => setProvider(current => ({ ...current, region: event.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Años de experiencia<Input type="number" min="0" value={provider.experience_years} onChange={event => setProvider(current => ({ ...current, experience_years: Number(event.target.value) }))} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Frase breve<Input value={provider.tagline || ''} onChange={event => setProvider(current => ({ ...current, tagline: event.target.value }))} /></label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Descripción<Textarea value={provider.bio || ''} onChange={event => setProvider(current => ({ ...current, bio: event.target.value }))} /></label>
          <div className="md:col-span-2"><Button disabled={saving || !provider.business_name.trim()} onClick={saveProviderProfile}><Save /> Guardar datos</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Servicios publicados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {services.map(service => (
            <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <b>{service.name}</b>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{service.category_slug} · {formatCLP(service.price)} {service.unit}</p>
              </div>
              <Button variant={service.active ? 'outline' : 'default'} disabled={saving} onClick={() => toggleService(service)}>
                {service.active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          ))}
          {services.length === 0 && <p className="text-sm text-muted-foreground">Este prestador no tiene servicios.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Agregar bloque de agenda</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <select className={fieldClass} value={newSlot.category_slug} onChange={event => setNewSlot(current => ({ ...current, category_slug: event.target.value }))}>
            <option value="">General / legacy</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
          <Input type="date" value={newSlot.date} onChange={event => setNewSlot(current => ({ ...current, date: event.target.value }))} />
          <Input type="time" value={newSlot.start_time} onChange={event => setNewSlot(current => ({ ...current, start_time: event.target.value }))} />
          <Input type="time" value={newSlot.end_time} onChange={event => setNewSlot(current => ({ ...current, end_time: event.target.value }))} />
          <Button disabled={saving} onClick={createSlot}><CalendarPlus /> Agregar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Agenda vigente del prestador</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {availability.map(slot => (
            <div key={slot.id} className="grid gap-2 rounded-xl border p-3 lg:grid-cols-[160px_150px_120px_120px_1fr_auto]">
              <select className={fieldClass} value={slot.category_slug || ''} onChange={event => editSlot(slot.id, { category_slug: event.target.value || null })}>
                <option value="">General / legacy</option>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
              <Input type="date" value={slot.date} onChange={event => editSlot(slot.id, { date: event.target.value })} />
              <Input type="time" value={slot.start_time?.slice(0, 5) || ''} onChange={event => editSlot(slot.id, { start_time: event.target.value })} />
              <Input type="time" value={slot.end_time?.slice(0, 5) || ''} onChange={event => editSlot(slot.id, { end_time: event.target.value })} />
              <Button variant={slot.available ? 'outline' : 'destructive'} onClick={() => editSlot(slot.id, { available: !slot.available })}>
                {slot.available ? 'Disponible' : 'Bloqueado'}
              </Button>
              <div className="flex gap-2">
                <Button size="icon" aria-label="Guardar bloque" disabled={saving} onClick={() => saveSlot(slot)}><Save /></Button>
                <Button size="icon" variant="outline" aria-label="Eliminar bloque" disabled={saving} onClick={() => removeSlot(slot)}><Trash2 /></Button>
              </div>
            </div>
          ))}
          {availability.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay bloques vigentes configurados.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
