'use client'

import * as React from 'react'
import { LoaderCircle, Save, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type ClientProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  comuna: string | null
}

export function ClientProfileForm({ profile }: { profile: ClientProfile }) {
  const supabase = React.useMemo(() => createClient(), [])
  const { refreshProfile } = useAuth()
  const [form, setForm] = React.useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    comuna: profile.comuna || '',
  })
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const fullName = form.full_name.trim()
    if (fullName.length < 2) {
      setError('Ingresa tu nombre completo.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: form.phone.trim() || null,
        comuna: form.comuna.trim() || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      setError(updateError.message || 'No se pudo guardar el perfil.')
      setSaving(false)
      return
    }

    await refreshProfile()
    setMessage('Perfil actualizado correctamente.')
    setSaving(false)
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-5">
      <label className="grid gap-1.5 text-sm font-medium">
        Nombre completo
        <Input
          required
          autoComplete="name"
          value={form.full_name}
          disabled={saving}
          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Correo electrónico
        <Input value={profile.email || ''} disabled aria-describedby="email-help" />
        <span id="email-help" className="text-xs text-muted-foreground">
          El correo pertenece a tu método de inicio de sesión.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Teléfono
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+56 9 1234 5678"
            value={form.phone}
            disabled={saving}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Comuna
          <Input
            autoComplete="address-level2"
            placeholder="Ej. Santiago"
            value={form.comuna}
            disabled={saving}
            onChange={(event) => setForm((current) => ({ ...current, comuna: event.target.value }))}
          />
        </label>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Tus datos están protegidos por permisos de cuenta.
        </span>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
