'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  BriefcaseBusiness,
  Camera,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
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
import { CATEGORIES, COMUNAS } from '@/lib/catalog'

type ProviderProfile = {
  id: string
  owner_id: string | null
  business_name: string
  category_slug: string
  tagline: string | null
  bio: string | null
  comuna: string | null
  region: string | null
  coverage: string[]
  experience_years: number
  image_url: string | null
  gallery: string[]
  active: boolean
  verified: boolean
}

const MAX_GALLERY_IMAGES = 8
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

function validateImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      'Solo se permiten imágenes JPG, PNG o WEBP.'
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      'Cada imagen debe pesar máximo 5 MB.'
    )
  }
}

function extensionFromFile(file: File) {
  const ext =
    file.name.split('.').pop()?.toLowerCase() ||
    'jpg'

  return ext === 'jpeg' ? 'jpg' : ext
}

export default function ProviderProfilePage() {
  const router = useRouter()

  const supabase = React.useMemo(
    () => createClient(),
    []
  )

  const [provider, setProvider] =
    React.useState<ProviderProfile | null>(null)

  const [loading, setLoading] =
    React.useState(true)

  const [saving, setSaving] =
    React.useState(false)

  const [uploadingAvatar, setUploadingAvatar] =
    React.useState(false)

  const [uploadingGallery, setUploadingGallery] =
    React.useState(false)

  const [error, setError] =
    React.useState('')

  const [success, setSuccess] =
    React.useState('')

  const [form, setForm] =
    React.useState({
      businessName: '',
      category: 'parrilleros',
      tagline: '',
      bio: '',
      comuna: '',
      experienceYears: 0,
    })

  const loadProvider =
    React.useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          window.location.assign(
            '/login?next=/prestador/perfil'
          )
          return
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (
          profile?.role !== 'prestador' &&
          profile?.role !== 'administrador'
        ) {
          router.replace('/cuenta')
          return
        }

        const {
          data,
          error: providerError,
        } = await supabase
          .from('service_providers')
          .select(
            `
              id,
              owner_id,
              business_name,
              category_slug,
              tagline,
              bio,
              comuna,
              region,
              coverage,
              experience_years,
              image_url,
              gallery,
              active,
              verified
            `
          )
          .eq('owner_id', user.id)
          .maybeSingle()

        if (providerError) {
          throw providerError
        }

        if (!data) {
          router.replace(
            '/prestador/onboarding'
          )
          return
        }

        const current =
          data as ProviderProfile

        setProvider(current)

        setForm({
          businessName:
            current.business_name || '',
          category:
            current.category_slug ||
            'parrilleros',
          tagline:
            current.tagline || '',
          bio:
            current.bio || '',
          comuna:
            current.comuna || '',
          experienceYears:
            current.experience_years || 0,
        })
      } catch (err: any) {
        console.error(
          'Error cargando perfil:',
          err
        )

        setError(
          err?.message ||
            'No se pudo cargar el perfil.'
        )
      } finally {
        setLoading(false)
      }
    }, [router, supabase])

  React.useEffect(() => {
    loadProvider()
  }, [loadProvider])

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function saveProfile(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!provider || saving) return

    setSaving(true)
    clearMessages()

    try {
      if (!form.businessName.trim()) {
        throw new Error(
          'Ingresa el nombre comercial.'
        )
      }

      if (!form.comuna) {
        throw new Error(
          'Selecciona una comuna.'
        )
      }

      const {
        error: updateError,
      } = await supabase
        .from('service_providers')
        .update({
          business_name:
            form.businessName.trim(),
          category_slug:
            form.category,
          tagline:
            form.tagline.trim(),
          bio:
            form.bio.trim(),
          comuna:
            form.comuna,
          coverage:
            form.comuna
              ? [form.comuna]
              : [],
          experience_years:
            Number(
              form.experienceYears
            ) || 0,
        })
        .eq('id', provider.id)

      if (updateError) {
        throw updateError
      }

      setSuccess(
        'Perfil actualizado correctamente.'
      )

      await loadProvider()
    } catch (err: any) {
      setError(
        err?.message ||
          'No se pudo actualizar el perfil.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatar(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file || !provider) return

    setUploadingAvatar(true)
    clearMessages()

    try {
      validateImage(file)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error(
          'Tu sesión expiró.'
        )
      }

      const ext =
        extensionFromFile(file)

      const path =
        `${provider.id}/profile-${Date.now()}.${ext}`

      const {
        error: uploadError,
      } = await supabase.storage
        .from('provider-gallery')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: publicData,
      } = supabase.storage
        .from('provider-gallery')
        .getPublicUrl(path)

      const url =
        publicData.publicUrl

      const oldImage =
        provider.image_url

      const {
        error: updateError,
      } = await supabase
        .from('service_providers')
        .update({
          image_url: url,
        })
        .eq('id', provider.id)

      if (updateError) {
        await supabase.storage
          .from('provider-gallery')
          .remove([path])

        throw updateError
      }

      if (oldImage) {
        const oldPath =
          extractStoragePath(
            oldImage,
            'provider-gallery'
          )

        if (oldPath) {
          await supabase.storage
            .from('provider-gallery')
            .remove([oldPath])
        }
      }

      setSuccess(
        'Foto de perfil actualizada.'
      )

      await loadProvider()
    } catch (err: any) {
      console.error(
        'Error subiendo foto:',
        err
      )

      setError(
        err?.message ||
          'No se pudo subir la imagen.'
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function uploadGallery(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    )

    event.target.value = ''

    if (!files.length || !provider) {
      return
    }

    setUploadingGallery(true)
    clearMessages()

    const currentGallery =
      provider.gallery || []

    try {
      const remaining =
        MAX_GALLERY_IMAGES -
        currentGallery.length

      if (remaining <= 0) {
        throw new Error(
          'Ya alcanzaste el máximo de 8 imágenes.'
        )
      }

      if (files.length > remaining) {
        throw new Error(
          `Puedes subir máximo ${remaining} imagen(es) más.`
        )
      }

      files.forEach(validateImage)

      const uploadedPaths: string[] = []
      const uploadedUrls: string[] = []

      for (const file of files) {
        const ext =
          extensionFromFile(file)

        const path =
          `${provider.id}/gallery-${Date.now()}-${crypto.randomUUID()}.${ext}`

        const {
          error: uploadError,
        } = await supabase.storage
          .from('provider-gallery')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          if (uploadedPaths.length) {
            await supabase.storage
              .from('provider-gallery')
              .remove(uploadedPaths)
          }

          throw uploadError
        }

        uploadedPaths.push(path)

        const {
          data: publicData,
        } = supabase.storage
          .from('provider-gallery')
          .getPublicUrl(path)

        uploadedUrls.push(
          publicData.publicUrl
        )
      }

      const newGallery = [
        ...currentGallery,
        ...uploadedUrls,
      ]

      const {
        error: updateError,
      } = await supabase
        .from('service_providers')
        .update({
          gallery: newGallery,
        })
        .eq('id', provider.id)

      if (updateError) {
        await supabase.storage
          .from('provider-gallery')
          .remove(uploadedPaths)

        throw updateError
      }

      setSuccess(
        'Galería actualizada correctamente.'
      )

      await loadProvider()
    } catch (err: any) {
      console.error(
        'Error subiendo galería:',
        err
      )

      setError(
        err?.message ||
          'No se pudieron subir las imágenes.'
      )
    } finally {
      setUploadingGallery(false)
    }
  }

  async function removeGalleryImage(
    url: string
  ) {
    if (!provider) return

    const confirmed =
      window.confirm(
        '¿Eliminar esta imagen de la galería?'
      )

    if (!confirmed) return

    clearMessages()

    try {
      const newGallery =
        provider.gallery.filter(
          (item) => item !== url
        )

      const {
        error: updateError,
      } = await supabase
        .from('service_providers')
        .update({
          gallery: newGallery,
        })
        .eq('id', provider.id)

      if (updateError) {
        throw updateError
      }

      const path =
        extractStoragePath(
          url,
          'provider-gallery'
        )

      if (path) {
        await supabase.storage
          .from('provider-gallery')
          .remove([path])
      }

      setSuccess(
        'Imagen eliminada.'
      )

      await loadProvider()
    } catch (err: any) {
      setError(
        err?.message ||
          'No se pudo eliminar la imagen.'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Cargando perfil...
        </div>
      </div>
    )
  }

  if (!provider) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <p className="text-sm font-semibold text-primary">
          Prestador
        </p>

        <h1 className="mt-1 text-3xl font-extrabold">
          Mi perfil profesional
        </h1>

        <p className="mt-2 text-muted-foreground">
          Esta información será visible
          para los clientes en Brasa.
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-5 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {success}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5" />
                Foto de perfil / logo
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
                {provider.image_url ? (
                  <Image
                    src={provider.image_url}
                    alt={
                      provider.business_name
                    }
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BriefcaseBusiness className="size-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <label className="mt-4 block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={
                    uploadingAvatar
                  }
                  onChange={
                    uploadAvatar
                  }
                />

                <div className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                  {uploadingAvatar ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      {provider.image_url
                        ? 'Cambiar imagen'
                        : 'Subir imagen'}
                    </>
                  )}
                </div>
              </label>

              <p className="mt-3 text-xs text-muted-foreground">
                JPG, PNG o WEBP. Máximo
                5 MB.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Estado
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Perfil
                </span>

                <b>
                  {provider.active
                    ? 'Activo'
                    : 'Pausado'}
                </b>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Verificación
                </span>

                <b>
                  {provider.verified
                    ? 'Verificado'
                    : 'Pendiente'}
                </b>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Información profesional
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={
                  saveProfile
                }
                className="space-y-4"
              >
                <label className="grid gap-1.5 text-sm">
                  Nombre comercial

                  <Input
                    required
                    disabled={saving}
                    value={
                      form.businessName
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        businessName:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    Categoría

                    <select
                      className="h-10 rounded-lg border bg-background px-3"
                      value={
                        form.category
                      }
                      disabled={saving}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category:
                            e.target
                              .value,
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
                      className="h-10 rounded-lg border bg-background px-3"
                      value={
                        form.comuna
                      }
                      required
                      disabled={saving}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          comuna:
                            e.target
                              .value,
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
                    maxLength={120}
                    disabled={saving}
                    value={
                      form.tagline
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tagline:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  Sobre tu servicio

                  <Textarea
                    rows={6}
                    disabled={saving}
                    value={form.bio}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bio:
                          e.target
                            .value,
                      })
                    }
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  Años de experiencia

                  <Input
                    type="number"
                    min={0}
                    max={60}
                    disabled={saving}
                    value={
                      form.experienceYears
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        experienceYears:
                          Number(
                            e.target
                              .value
                          ),
                      })
                    }
                  />
                </label>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Save />
                  )}

                  {saving
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="size-5" />
                Galería de trabajos
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Puedes subir hasta 8
                imágenes.
              </p>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {provider.gallery.map(
                  (url, index) => (
                    <div
                      key={url}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted"
                    >
                      <Image
                        src={url}
                        alt={`Trabajo ${index + 1} de ${provider.business_name}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 250px"
                        className="object-cover"
                      />

                      <div className="absolute inset-0 flex items-end justify-end bg-black/0 p-2 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() =>
                            removeGalleryImage(
                              url
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  )
                )}

                {provider.gallery.length <
                  MAX_GALLERY_IMAGES && (
                  <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 text-center transition hover:bg-muted">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={
                        uploadingGallery
                      }
                      onChange={
                        uploadGallery
                      }
                    />

                    {uploadingGallery ? (
                      <>
                        <LoaderCircle className="size-6 animate-spin text-primary" />
                        <span className="mt-2 text-xs text-muted-foreground">
                          Subiendo...
                        </span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="size-7 text-primary" />

                        <span className="mt-2 text-sm font-medium">
                          Agregar fotos
                        </span>

                        <span className="mt-1 text-xs text-muted-foreground">
                          {
                            MAX_GALLERY_IMAGES -
                            provider
                              .gallery
                              .length
                          }{' '}
                          disponibles
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function extractStoragePath(
  publicUrl: string,
  bucket: string
) {
  const marker =
    `/storage/v1/object/public/${bucket}/`

  const index =
    publicUrl.indexOf(marker)

  if (index === -1) return null

  return decodeURIComponent(
    publicUrl.slice(
      index + marker.length
    )
  )
}