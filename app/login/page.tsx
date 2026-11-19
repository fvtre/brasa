'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Flame, LoaderCircle, LogIn } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

function LoginPageContent() {
  const params = useSearchParams()
  const supabase = React.useMemo(() => createClient(), [])
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(params.get('error') || '')
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)
  const [resendBusy, setResendBusy] = React.useState(false)
  const [resendMessage, setResendMessage] = React.useState('')
  const [resendError, setResendError] = React.useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    setNeedsConfirmation(false)
    setResendMessage('')
    setResendError('')

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
        setNeedsConfirmation(true)
      } else {
        setError(message)
      }

      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (!email.trim() || resendBusy) return

    setResendBusy(true)
    setResendMessage('')
    setResendError('')

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/cuenta`
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      })

      if (resendError) throw resendError
      setResendMessage('Solicitamos otro correo de confirmación. Revisa también la carpeta de spam.')
    } catch (err: any) {
      setResendError(String(err?.message || 'No se pudo reenviar el correo de confirmación.'))
    } finally {
      setResendBusy(false)
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  setNeedsConfirmation(false)
                  setResendMessage('')
                  setResendError('')
                }}
                placeholder="tu@correo.cl"
              />
            </label>

            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="login-password">Contraseña</label>
                <Link
                  href="/recuperar-contrasena"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="space-y-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <p>{error}</p>
                {needsConfirmation && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={resendBusy || !email.trim()}
                      onClick={resendConfirmation}
                      className="font-semibold underline underline-offset-2 disabled:opacity-50"
                    >
                      {resendBusy ? 'Reenviando...' : 'Reenviar correo de confirmación'}
                    </button>
                    {resendMessage && <p role="status">{resendMessage}</p>}
                    {resendError && <p role="alert">{resendError}</p>}
                  </div>
                )}
              </div>
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

          <div className="mt-5">
            <OAuthButtons next={params.get('next') || '/cuenta'} />
          </div>

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

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageContent />
    </React.Suspense>
  )
}
