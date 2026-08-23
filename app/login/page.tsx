'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Flame, LoaderCircle, LogIn } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const params = useSearchParams()
  const supabase = React.useMemo(() => createClient(), [])
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(params.get('error') || '')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) throw loginError
      if (!data.user || !data.session) throw new Error('Supabase no devolvió una sesión válida.')

      // Garantiza que profiles exista y sincroniza cliente/prestador desde user_metadata.
      const { error: profileError } = await supabase.rpc('ensure_my_profile')
      if (profileError) {
        console.error('ensure_my_profile:', profileError)
      }

      const next = params.get('next') || '/cuenta'

      // Recarga completa para que el servidor reciba las cookies recién creadas.
      window.location.assign(next)
    } catch (err: any) {
      const message = String(err?.message || 'No se pudo iniciar sesión.')
      const lower = message.toLowerCase()

      if (lower.includes('invalid login credentials')) {
        setError('Correo o contraseña incorrectos.')
      } else if (lower.includes('email not confirmed')) {
        setError('Debes confirmar tu correo antes de ingresar.')
      } else {
        setError(message)
      }

      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12">
      <Card className="w-full rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flame />
          </div>
          <CardTitle className="text-2xl">Entrar a Brasa</CardTitle>
          <p className="text-sm text-muted-foreground">Gestiona tu evento o tus servicios.</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1.5 text-sm">
              Email
              <Input
                type="email"
                autoComplete="email"
                required
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.cl"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              Contraseña
              <Input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim() || password.length < 6}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {busy ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link className="font-semibold text-primary" href="/registro">
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
