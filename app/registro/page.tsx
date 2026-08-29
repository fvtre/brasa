'use client'

import * as React from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Flame, LoaderCircle, PartyPopper } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

type Role = 'cliente' | 'prestador'

export default function RegisterPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [role, setRole] = React.useState<Role>('cliente')
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '' })
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/cuenta`

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: form.name.trim(),
            phone: form.phone.trim(),
            role,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.session) {
        await supabase.rpc('ensure_my_profile')
        window.location.assign('/cuenta')
        return
      }

      setMessage(
        role === 'prestador'
          ? 'Cuenta de prestador creada. Revisa tu correo para confirmar el acceso.'
          : 'Cuenta creada. Revisa tu correo para confirmar el acceso.'
      )
      setBusy(false)
    } catch (err: any) {
      setError(String(err?.message || 'No se pudo crear la cuenta.'))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card className="rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flame />
          </div>
          <CardTitle className="text-2xl">Únete a Brasa</CardTitle>
          <p className="text-sm text-muted-foreground">Elige cómo quieres usar la plataforma.</p>
        </CardHeader>

        <CardContent>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('cliente')}
              className={`rounded-xl border p-4 text-left transition ${
                role === 'cliente' ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <PartyPopper className="mb-2 size-5" />
              <b>Cliente</b>
              <p className="mt-1 text-xs text-muted-foreground">Organizar y contratar servicios.</p>
            </button>

            <button
              type="button"
              onClick={() => setRole('prestador')}
              className={`rounded-xl border p-4 text-left transition ${
                role === 'prestador' ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <BriefcaseBusiness className="mb-2 size-5" />
              <b>Prestador</b>
              <p className="mt-1 text-xs text-muted-foreground">Publicar y vender tus servicios.</p>
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1.5 text-sm">
              Nombre completo
              <Input
                required
                disabled={busy}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Email
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                Teléfono
                <Input
                  value={form.phone}
                  disabled={busy}
                  placeholder="+56 9..."
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              Contraseña
              <Input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={busy}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            )}
            {message && (
              <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">{message}</p>
            )}

            <button
              type="submit"
              disabled={busy || !form.name.trim() || !form.email.trim() || form.password.length < 6}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : role === 'prestador' ? (
                <BriefcaseBusiness className="size-4" />
              ) : (
                <PartyPopper className="size-4" />
              )}

              {busy
                ? 'Creando...'
                : role === 'prestador'
                  ? 'Crear cuenta de prestador'
                  : 'Crear cuenta de cliente'}
            </button>
          </form>

          <div className="mt-5">
            <OAuthButtons role={role} mode="register" />
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-primary">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
