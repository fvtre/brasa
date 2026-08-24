'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  BriefcaseBusiness,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  CATEGORIES,
  COMUNAS,
} from '@/lib/catalog'

export default function ProviderOnboarding() {
  const router = useRouter()

  const supabase = React.useMemo(
    () => createClient(),
    []
  )

  const [loading, setLoading] =
    React.useState(true)

  const [busy, setBusy] =
    React.useState(false)

  const [error, setError] =
    React.useState('')

  const [f, setF] = React.useState({
    businessName: '',
    category: 'parrilleros',
    tagline: '',
    bio: '',
    comuna: '',
    experienceYears: 0,
  })

  React.useEffect(() => {
    async function checkProvider() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.assign(
          '/login?next=/prestador/onboarding'
        )
        return
      }

      const {
        data: profile,
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (
        profile?.role !== 'prestador' &&
        profile?.role !== 'administrador'
      ) {
        router.replace('/cuenta')
        return
      }

      const {
        data: provider,
      } = await supabase
        .from('service_providers')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (provider) {
        router.replace(
          '/prestador/dashboard'
        )
        return
      }

      setLoading(false)
    }

    checkProvider()
  }, [router, supabase])

  async function submit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (busy) return

    setBusy(true)
    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.'
        )
      }

      if (!f.businessName.trim()) {
        throw new Error(
          'Ingresa un nombre comercial.'
        )
      }

      if (!f.comuna) {
        throw new Error(
          'Selecciona una comuna.'
        )
      }

      const cleanName =
        f.businessName
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            ''
          )
          .replace(
            /[^a-z0-9]+/g,
            '-'
          )
          .replace(
            /(^-|-$)/g,
            ''
          )

      const slug =
        `${cleanName}-${user.id.slice(0, 6)}`

      const {
        data: existing,
      } = await supabase
        .from('service_providers')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (existing) {
        window.location.assign(
          '/prestador/dashboard'
        )
        return
      }

      const {
        error: insertError,
      } = await supabase
        .from('service_providers')
        .insert({
          owner_id: user.id,
          slug,
          business_name:
            f.businessName.trim(),

          category_slug:
            f.category,

          tagline:
            f.tagline.trim(),

          bio:
            f.bio.trim(),

          comuna:
            f.comuna,

          experience_years:
            Number(
              f.experienceYears
            ) || 0,

          coverage:
            f.comuna
              ? [f.comuna]
              : [],
        })

      if (insertError) {
        throw insertError
      }

      window.location.assign(
        '/prestador/servicios'
      )
    } catch (err: any) {
      console.error(
        'Error creando prestador:',
        err
      )

      setError(
        err?.message ||
          'No se pudo crear el perfil profesional.'
      )

      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Preparando tu perfil...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseBusiness />
          </div>

          <CardTitle className="mt-3 text-2xl">
            Configura tu perfil de prestador
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Esta información será visible para
            los clientes cuando publiques tus
            servicios.
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={submit}
            className="space-y-5"
          >
            <label className="grid gap-1.5 text-sm">
              Nombre comercial

              <Input
                required
                disabled={busy}
                value={f.businessName}
                placeholder="Ej: Barra Nómada"
                onChange={(e) =>
                  setF({
                    ...f,
                    businessName:
                      e.target.value,
                  })
                }
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Categoría

                <select
                  className="h-10 rounded-lg border bg-background px-3"
                  value={f.category}
                  disabled={busy}
                  onChange={(e) =>
                    setF({
                      ...f,
                      category:
                        e.target.value,
                    })
                  }
                >
                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category.slug
                        }
                        value={
                          category.slug
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                Comuna principal

                <select
                  required
                  className="h-10 rounded-lg border bg-background px-3"
                  value={f.comuna}
                  disabled={busy}
                  onChange={(e) =>
                    setF({
                      ...f,
                      comuna:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecciona
                  </option>

                  {COMUNAS.map(
                    (comuna) => (
                      <option
                        key={comuna}
                        value={comuna}
                      >
                        {comuna}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              Frase de presentación

              <Input
                value={f.tagline}
                disabled={busy}
                maxLength={120}
                onChange={(e) =>
                  setF({
                    ...f,
                    tagline:
                      e.target.value,
                  })
                }
                placeholder="Ej: Coctelería de autor para tus invitados"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              Sobre tu servicio

              <Textarea
                rows={5}
                value={f.bio}
                disabled={busy}
                onChange={(e) =>
                  setF({
                    ...f,
                    bio:
                      e.target.value,
                  })
                }
                placeholder="Cuéntales a los clientes sobre tu experiencia, estilo de trabajo y especialidades."
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              Años de experiencia

              <Input
                type="number"
                min={0}
                max={60}
                disabled={busy}
                value={
                  f.experienceYears
                }
                onChange={(e) =>
                  setF({
                    ...f,
                    experienceYears:
                      Number(
                        e.target.value
                      ),
                  })
                }
              />
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-primary" />
                Siguiente paso
              </div>

              <p className="mt-1 text-muted-foreground">
                Después crearás tus
                servicios, precios y
                disponibilidad.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <BriefcaseBusiness />
              )}

              {busy
                ? 'Guardando...'
                : 'Crear perfil profesional'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}