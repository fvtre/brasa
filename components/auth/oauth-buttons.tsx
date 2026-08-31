'use client'

import * as React from 'react'
import { LoaderCircle } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type OAuthProvider = 'google' | 'facebook'
type SelectableRole = 'cliente' | 'prestador'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.53l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" fill="currentColor">
      <path d="M13.58 22v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.03.29-1.73 1.76-1.73h1.88V2.14A25.2 25.2 0 0 0 14.48 2c-2.71 0-4.57 1.66-4.57 4.7v2.62H6.85v3.56h3.06V22h3.67Z" />
    </svg>
  )
}

export function OAuthButtons({
  role,
  next = '/cuenta',
  mode = 'login',
}: {
  role?: SelectableRole
  next?: string
  mode?: 'login' | 'register'
}) {
  const supabase = React.useMemo(() => createClient(), [])
  const [busy, setBusy] = React.useState<OAuthProvider | null>(null)
  const [error, setError] = React.useState('')

  async function continueWith(provider: OAuthProvider) {
    if (busy) return

    setBusy(provider)
    setError('')

    try {
      const callback = new URL('/auth/callback', window.location.origin)
      callback.searchParams.set('next', next.startsWith('/') ? next : '/cuenta')

      if (role) {
        callback.searchParams.set('role', role)
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback.toString(),
        },
      })

      if (oauthError) throw oauthError
    } catch (err: any) {
      setError(String(err?.message || 'No se pudo iniciar la autenticación.'))
      setBusy(null)
    }
  }

  const action = mode === 'register' ? 'Registrarse con' : 'Continuar con'

  return (
    <div className="space-y-3">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground">o usa</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => continueWith('google')}
          className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8faff] disabled:pointer-events-none disabled:opacity-50 dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#202124]"
        >
          {busy === 'google' ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleIcon />}
          {action} Google
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => continueWith('facebook')}
          className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-[#1877f2] bg-[#1877f2] px-3 text-sm font-semibold text-white transition hover:bg-[#166fe5] disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === 'facebook' ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FacebookIcon />
          )}
          {action} Facebook
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
