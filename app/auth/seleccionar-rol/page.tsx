'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { BriefcaseBusiness, LoaderCircle, PartyPopper } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Role = 'cliente' | 'prestador'

function SelectRoleContent() {
  const params = useSearchParams()
  const supabase = React.useMemo(() => createClient(), [])
  const [role, setRole] = React.useState<Role>('cliente')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function continueToBrasa() {
    if (busy) return

    setBusy(true)
    setError('')

    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role },
      })

      if (metadataError) throw metadataError

      const { error: profileError } = await supabase.rpc('ensure_my_profile')
      if (profileError) throw profileError

      const requestedNext = params.get('next') || '/cuenta'
      const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
        ? requestedNext
        : '/cuenta'

      window.location.assign(next)
    } catch (err: any) {
      setError(String(err?.message || 'No se pudo guardar el tipo de cuenta.'))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
      <Card className="w-full rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">¿Cómo usarás Brasa?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta elección define el panel y las herramientas de tu cuenta.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setRole('cliente')}
              className={`rounded-xl border p-4 text-left transition ${
                role === 'cliente' ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <PartyPopper className="mb-2 size-5" />
              <b>Cliente</b>
              <p className="mt-1 text-xs text-muted-foreground">
                Organizar eventos y contratar servicios.
              </p>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => setRole('prestador')}
              className={`rounded-xl border p-4 text-left transition ${
                role === 'prestador' ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <BriefcaseBusiness className="mb-2 size-5" />
              <b>Prestador</b>
              <p className="mt-1 text-xs text-muted-foreground">
                Publicar y administrar servicios.
              </p>
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={continueToBrasa}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy ? 'Guardando...' : 'Continuar'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SelectRolePage() {
  return (
    <React.Suspense fallback={null}>
      <SelectRoleContent />
    </React.Suspense>
  )
}
