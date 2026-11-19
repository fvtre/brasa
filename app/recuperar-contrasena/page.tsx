'use client'

import * as React from 'react'
import Link from 'next/link'
import { Flame, LoaderCircle, MailCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RecoverPasswordPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [email, setEmail] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [sent, setSent] = React.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setSent(false)

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/restablecer-contrasena`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace de recuperación.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12">
      <Card className="w-full rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {sent ? <MailCheck /> : <Flame />}
          </div>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un enlace para crear una contraseña nueva.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1.5 text-sm">
              Email
              <Input
                type="email"
                autoComplete="email"
                required
                disabled={busy || sent}
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="tu@correo.cl"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {sent && (
              <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisa también spam.
              </p>
            )}

            {!sent && (
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {busy ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
