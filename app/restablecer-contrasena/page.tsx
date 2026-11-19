'use client'

import * as React from 'react'
import Link from 'next/link'
import { Flame, LoaderCircle, ShieldCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [hasSession, setHasSession] = React.useState<boolean | null>(null)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [updated, setUpdated] = React.useState(false)

  React.useEffect(() => {
    let active = true

    async function checkSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      if (sessionError) setError(sessionError.message)
      setHasSession(Boolean(data.session))
    }

    void checkSession()
    return () => {
      active = false
    }
  }, [supabase])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setError('')
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Usa al menos 10 caracteres, con mayúscula, minúscula y número.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setUpdated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12">
      <Card className="w-full rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {updated ? <ShieldCheck /> : <Flame />}
          </div>
          <CardTitle className="text-2xl">Crear contraseña nueva</CardTitle>
          <p className="text-sm text-muted-foreground">
            {updated
              ? 'Tu contraseña se actualizó correctamente.'
              : 'Elige una contraseña segura para tu cuenta.'}
          </p>
        </CardHeader>

        <CardContent>
          {hasSession === null ? (
            <div className="flex justify-center py-4">
              <LoaderCircle className="size-5 animate-spin text-primary" />
            </div>
          ) : updated ? (
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Volver al inicio de sesión
            </Link>
          ) : !hasSession ? (
            <div className="space-y-4">
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                El enlace no es válido o ya venció. Solicita uno nuevo para continuar.
              </p>
              <Link
                href="/recuperar-contrasena"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Solicitar otro enlace
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="grid gap-1.5 text-sm">
                Nueva contraseña
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  disabled={busy}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                Confirmar contraseña
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  disabled={busy}
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">
                  Mínimo 10 caracteres, con mayúscula, minúscula y número.
                </span>
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !password || !confirmPassword}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {busy ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
