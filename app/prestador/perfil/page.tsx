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

type CategoryProfileRow = {
  category_slug: string
  description: string | null
  cover_image_url: string | null
  gallery: Array<{
    id: string
    image_url: string
    sort_order: number
  }>
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

  const [selectedCategories, setSelectedCategories] =
    React.useState<string[]>([])

  const [serviceCategorySlugs, setServiceCategorySlugs] =
    React.useState<string[]>([])

  const [categoryProfiles, setCategoryProfiles] =
    React.useState<CategoryProfileRow[]>([])

  const [selectedProfileCategory, setSelectedProfileCategory] =
    React.useState('')

  const [categoryDescription, setCategoryDescription] =
    React.useState('')

  const [savingCategoryProfile, setSavingCategoryProfile] =
    React.useState(false)

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

        const [categoriesResult, servicesResult] =
          await Promise.all([
            supabase
              .from('provider_categories')
              .select(`
                category_slug,
                description,
                cover_image_url,
                gallery:provider_category_gallery(id,image_url,sort_order)
              `)
              .eq('provider_id', current.id),
            supabase
              .from('provider_services')
              .select('category_slug')
              .eq('provider_id', current.id),
          ])

        if (categoriesResult.error) {
          throw categoriesResult.error
        }

        if (servicesResult.error) {
          throw servicesResult.error
        }

        const assignedCategories = Array.from(
          new Set([
            current.category_slug,
            ...(categoriesResult.data || []).map(
              (item) => item.category_slug
            ),
          ].filter(Boolean))
        )

        const categoriesInUse = Array.from(
          new Set(
            (servicesResult.data || [])
              .map((item) => item.category_slug)
              .filter(Boolean)
          )
        )

        setProvider(current)
        setSelectedCategories(assignedCategories)
        setServiceCategorySlugs(categoriesInUse)
        setCategoryProfiles(
          (categoriesResult.data || []) as CategoryProfileRow[]
        )
        setSelectedProfileCategory((previous) => {
          const target = assignedCategories.includes(previous)
            ? previous
            : current.category_slug || assignedCategories[0] || ''
          const categoryProfile =
            (categoriesResult.data || []).find(
              (item) => item.category_slug === target
            )
          setCategoryDescription(categoryProfile?.description || '')
          return target
        })

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

      if (selectedCategories.length === 0) {
        throw new Error(
          'Selecciona al menos una categoría de servicios.'
        )
      }

      if (!selectedCategories.includes(form.category)) {
        throw new Error(
          'La categoría principal debe estar entre tus categorías seleccionadas.'
        )
      }

      const {
        data: currentCategoryRows,
        error: currentCategoriesError,
      } = await supabase
        .from('provider_categories')
        .select('category_slug')
        .eq('provider_id', provider.id)

      if (currentCategoriesError) {
        throw currentCategoriesError
      }

      const currentCategorySlugs =
        (currentCategoryRows || []).map(
          (item) => item.category_slug
        )

      const categoriesToInsert =
        selectedCategories.filter(
          (categorySlug) =>
            !currentCategorySlugs.includes(categorySlug)
        )

      if (categoriesToInsert.length > 0) {
        const { error: categoriesInsertError } =
          await supabase
            .from('provider_categories')
            .insert(
              categoriesToInsert.map((categorySlug) => ({
                provider_id: provider.id,
                category_slug: categorySlug,
              }))
            )

        if (categoriesInsertError) {
          throw categoriesInsertError
        }
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

      const removedCategories =
        (currentCategoryRows || [])
          .map((item) => item.category_slug)
          .filter(
            (categorySlug) =>
              !selectedCategories.includes(categorySlug)
          )

      if (removedCategories.length > 0) {
        const { error: categoriesDeleteError } =
          await supabase
            .from('provider_categories')
            .delete()
            .eq('provider_id', provider.id)
            .in('category_slug', removedCategories)

        if (categoriesDeleteError) {
          throw categoriesDeleteError
        }
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

  function toggleCategory(categorySlug: string) {
    const isSelected =
      selectedCategories.includes(categorySlug)

    if (
      isSelected &&
      serviceCategorySlugs.includes(categorySlug)
    ) {
      setError(
        'No puedes quitar una categoría que todavía tiene servicios publicados.'
      )
      return
    }

    clearMessages()

    const nextCategories = isSelected
      ? selectedCategories.filter(
          (slug) => slug !== categorySlug
        )
      : [...selectedCategories, categorySlug]

    setSelectedCategories(nextCategories)

    if (
      form.category === categorySlug &&
      !nextCategories.includes(categorySlug)
    ) {
      setForm({
        ...form,
        category: nextCategories[0] || '',
      })
    }
  }

  function selectCategoryProfile(categorySlug: string) {
    const profile = categoryProfiles.find(
      (item) => item.category_slug === categorySlug
    )
    setSelectedProfileCategory(categorySlug)
    setCategoryDescription(profile?.description || '')
    clearMessages()
  }

  async function saveCategoryProfile() {
    if (!provider || !selectedProfileCategory) return
    setSavingCategoryProfile(true)
    clearMessages()
    try {
      const { error: updateError } = await supabase
        .from('provider_categories')
        .update({
          description: categoryDescription.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id)
        .eq('category_slug', selectedProfileCategory)

      if (updateError) throw updateError
      setSuccess('Perfil de categoría actualizado.')
      await loadProvider()
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la categoría.')
    } finally {
      setSavingCategoryProfile(false)
    }
  }

  async function uploadCategoryCover(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !provider || !selectedProfileCategory) return
    setSavingCategoryProfile(true)
    clearMessages()
    try {
      validateImage(file)
      const ext = extensionFromFile(file)
      const path = `${provider.id}/${selectedProfileCategory}/cover-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('provider-gallery')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
      if (uploadError) throw uploadError
      const { data: publicData } = supabase.storage
        .from('provider-gallery')
        .getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('provider_categories')
        .update({
          cover_image_url: publicData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id)
        .eq('category_slug', selectedProfileCategory)
      if (updateError) {
        await supabase.storage.from('provider-gallery').remove([path])
        throw updateError
      }
      setSuccess('Portada de categoría actualizada.')
      await loadProvider()
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir la portada.')
    } finally {
      setSavingCategoryProfile(false)
    }
  }

  async function uploadCategoryGallery(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length || !provider || !selectedProfileCategory) return
    const currentProfile = categoryProfiles.find(
      (item) => item.category_slug === selectedProfileCategory
    )
    setSavingCategoryProfile(true)
    clearMessages()
    try {
      const remaining = MAX_GALLERY_IMAGES - (currentProfile?.gallery.length || 0)
      if (files.length > remaining) {
        throw new Error(`Puedes subir máximo ${remaining} imagen(es) más.`)
      }
      files.forEach(validateImage)
      const uploaded: Array<{ path: string; url: string; sort_order: number }> = []
      for (const [index, file] of files.entries()) {
        const ext = extensionFromFile(file)
        const path = `${provider.id}/${selectedProfileCategory}/gallery-${Date.now()}-${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('provider-gallery')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })
        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage
          .from('provider-gallery')
          .getPublicUrl(path)
        uploaded.push({
          path,
          url: publicData.publicUrl,
          sort_order: (currentProfile?.gallery.length || 0) + index,
        })
      }
      const { error: insertError } = await supabase
        .from('provider_category_gallery')
        .insert(uploaded.map((item) => ({
          provider_id: provider.id,
          category_slug: selectedProfileCategory,
          image_url: item.url,
          sort_order: item.sort_order,
        })))
      if (insertError) {
        await supabase.storage
          .from('provider-gallery')
          .remove(uploaded.map((item) => item.path))
        throw insertError
      }
      setSuccess('Galería de categoría actualizada.')
      await loadProvider()
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la galería de categoría.')
    } finally {
      setSavingCategoryProfile(false)
    }
  }

  async function removeCategoryGalleryImage(
    image: CategoryProfileRow['gallery'][number]
  ) {
    if (!provider) return
    setSavingCategoryProfile(true)
    clearMessages()
    try {
      const { error: deleteError } = await supabase
        .from('provider_category_gallery')
        .delete()
        .eq('id', image.id)
        .eq('provider_id', provider.id)
      if (deleteError) throw deleteError
      const path = extractStoragePath(image.image_url, 'provider-gallery')
      if (path) {
        await supabase.storage.from('provider-gallery').remove([path])
      }
      setSuccess('Imagen eliminada.')
      await loadProvider()
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la imagen.')
    } finally {
      setSavingCategoryProfile(false)
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

  const activeCategoryProfile = categoryProfiles.find(
    (item) => item.category_slug === selectedProfileCategory
  )

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

                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Categorías que ofrece tu negocio
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Puedes ofrecer servicios en tantas categorías como correspondan.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        clearMessages()
                        setSelectedCategories(
                          CATEGORIES.map((category) => category.slug)
                        )
                      }}
                    >
                      Seleccionar todas
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIES.map((category) => {
                      const checked =
                        selectedCategories.includes(category.slug)
                      const inUse =
                        serviceCategorySlugs.includes(category.slug)

                      return (
                        <label
                          key={category.slug}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={checked}
                            disabled={saving || (checked && inUse)}
                            onChange={() => toggleCategory(category.slug)}
                          />
                          <span className="flex-1">{category.name}</span>
                          {inUse && (
                            <span className="text-[10px] text-muted-foreground">
                              En uso
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    Categoría principal

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
                      {CATEGORIES.filter(
                        (category) =>
                          selectedCategories.includes(category.slug)
                      ).map(
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
              <CardTitle>Perfil por categoría</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configura la presentación que verá el cliente al entrar desde cada categoría.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="grid gap-1.5 text-sm">
                Categoría a editar
                <select
                  className="h-10 rounded-lg border bg-background px-3"
                  value={selectedProfileCategory}
                  disabled={savingCategoryProfile}
                  onChange={(event) => selectCategoryProfile(event.target.value)}
                >
                  {categoryProfiles.map((profile) => (
                    <option key={profile.category_slug} value={profile.category_slug}>
                      {CATEGORIES.find((item) => item.slug === profile.category_slug)?.name || profile.category_slug}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                Descripción de esta categoría
                <Textarea
                  rows={4}
                  value={categoryDescription}
                  disabled={savingCategoryProfile}
                  onChange={(event) => setCategoryDescription(event.target.value)}
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-medium">Imagen de portada</p>
                {activeCategoryProfile?.cover_image_url && (
                  <div className="relative mb-3 aspect-[16/7] overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={activeCategoryProfile.cover_image_url}
                      alt="Portada de categoría"
                      fill
                      sizes="600px"
                      className="object-cover"
                    />
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={savingCategoryProfile}
                    onChange={uploadCategoryCover}
                  />
                  <Upload className="size-4" />
                  Subir portada
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Galería de esta categoría</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {(activeCategoryProfile?.gallery || []).map((image, index) => (
                    <div key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                      <Image
                        src={image.image_url}
                        alt={`Imagen ${index + 1}`}
                        fill
                        sizes="250px"
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
                        disabled={savingCategoryProfile}
                        onClick={() => removeCategoryGalleryImage(image)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {(activeCategoryProfile?.gallery.length || 0) < MAX_GALLERY_IMAGES && (
                    <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 text-sm">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        disabled={savingCategoryProfile}
                        onChange={uploadCategoryGallery}
                      />
                      <ImagePlus className="mb-2 size-6 text-primary" />
                      Agregar fotos
                    </label>
                  )}
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={savingCategoryProfile || !selectedProfileCategory}
                onClick={saveCategoryProfile}
              >
                {savingCategoryProfile ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                Guardar perfil de categoría
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="size-5" />
                Galería general (legacy)
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
