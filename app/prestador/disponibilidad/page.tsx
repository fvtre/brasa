'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AvailabilityRow = {
  id: string
  provider_id?: string
  category_slug: string | null
  date: string
  start_time: string | null
  end_time: string | null
  available: boolean
  notes?: string | null
}

const DEFAULT_FORM = {
  date: '',
  start: '12:00',
  end: '23:00',
}

function hhmm(value?: string | null) {
  return String(value || '').slice(0, 5)
}

function todayLocal() {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    now.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(date: string) {
  return new Date(
    `${date}T12:00:00`
  ).toLocaleDateString(
    'es-CL',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )
}

/*
 * Determina si dos intervalos horarios
 * se cruzan.
 *
 * Ej:
 * 12:00-18:00 y 15:00-20:00 => true
 * 12:00-15:00 y 15:00-18:00 => false
 */
function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return (
    startA < endB &&
    endA > startB
  )
}

export default function AvailabilityPage() {
  const router = useRouter()

  const supabase =
    React.useMemo(
      () => createClient(),
      []
    )

  const today =
    React.useMemo(
      () => todayLocal(),
      []
    )

  const [
    providerId,
    setProviderId,
  ] = React.useState('')

  const [providerCategories, setProviderCategories] =
    React.useState<string[]>([])

  const [selectedCategory, setSelectedCategory] =
    React.useState('')

  const [
    rows,
    setRows,
  ] =
    React.useState<
      AvailabilityRow[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    React.useState(true)

  const [
    busy,
    setBusy,
  ] =
    React.useState(false)

  const [
    error,
    setError,
  ] =
    React.useState('')

  const [
    success,
    setSuccess,
  ] =
    React.useState('')

  const [
    f,
    setF,
  ] =
    React.useState(
      DEFAULT_FORM
    )

  const [
    editingId,
    setEditingId,
  ] =
    React.useState<
      string | null
    >(null)

  const [
    editForm,
    setEditForm,
  ] =
    React.useState({
      date: '',
      start: '',
      end: '',
    })

  const [
    duplicateRow,
    setDuplicateRow,
  ] =
    React.useState<
      AvailabilityRow | null
    >(null)

  const [
    duplicateDate,
    setDuplicateDate,
  ] =
    React.useState('')

  /* ======================================================
     CARGAR
  ====================================================== */

  const load =
    React.useCallback(
      async () => {
        setLoading(true)
        setError('')

        try {
          const {
            data: {
              user,
            },
            error:
              authError,
          } =
            await supabase.auth.getUser()

          if (
            authError ||
            !user
          ) {
            window.location.assign(
              '/login?next=/prestador/disponibilidad'
            )

            return
          }

          const {
            data:
              profile,
            error:
              profileError,
          } =
            await supabase
              .from(
                'profiles'
              )
              .select(
                'role'
              )
              .eq(
                'id',
                user.id
              )
              .maybeSingle()

          if (
            profileError
          ) {
            throw profileError
          }

          if (
            profile?.role !==
              'prestador' &&
            profile?.role !==
              'administrador'
          ) {
            router.replace(
              '/cuenta'
            )

            return
          }

          const {
            data:
              provider,
            error:
              providerError,
          } =
            await supabase
              .from(
                'service_providers'
              )
              .select(
                'id'
              )
              .eq(
                'owner_id',
                user.id
              )
              .maybeSingle()

          if (
            providerError
          ) {
            throw providerError
          }

          if (
            !provider
          ) {
            router.replace(
              '/prestador/onboarding'
            )

            return
          }

          setProviderId(
            provider.id
          )

          const { data: categoriesData, error: categoriesError } =
            await supabase
              .from('provider_categories')
              .select('category_slug')
              .eq('provider_id', provider.id)
              .order('category_slug')

          if (categoriesError) {
            throw categoriesError
          }

          const categories = (categoriesData || [])
            .map((item) => item.category_slug)
            .filter(Boolean)

          const categoryToLoad =
            categories.includes(selectedCategory)
              ? selectedCategory
              : categories[0] || ''

          setProviderCategories(categories)
          setSelectedCategory(categoryToLoad)

          if (!categoryToLoad) {
            setRows([])
            return
          }

          const {
            data,
            error:
              availabilityError,
          } =
            await supabase
              .from(
                'provider_availability'
              )
              .select(
                'id,provider_id,category_slug,date,start_time,end_time,available,notes'
              )
              .eq(
                'provider_id',
                provider.id
              )
              .eq('category_slug', categoryToLoad)
              .gte(
                'date',
                today
              )
              .order(
                'date',
                {
                  ascending:
                    true,
                }
              )
              .order(
                'start_time',
                {
                  ascending:
                    true,
                }
              )

          if (
            availabilityError
          ) {
            throw availabilityError
          }

          setRows(
            (
              data ||
              []
            ) as AvailabilityRow[]
          )
        } catch (
          err: any
        ) {
          console.error(
            'Error cargando disponibilidad:',
            err
          )

          setError(
            err?.message ||
              'No se pudo cargar tu disponibilidad.'
          )
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        router,
        supabase,
        today,
        selectedCategory,
      ]
    )

  React.useEffect(
    () => {
      load()
    },
    [load]
  )

  /* ======================================================
     VALIDAR BLOQUE
  ====================================================== */

  function validateBlock({
    date,
    start,
    end,
    ignoreId,
  }: {
    date: string
    start: string
    end: string
    ignoreId?: string
  }) {
    if (!date) {
      throw new Error(
        'Selecciona una fecha.'
      )
    }

    if (
      date <
      today
    ) {
      throw new Error(
        'No puedes agregar una fecha pasada.'
      )
    }

    if (
      !start ||
      !end
    ) {
      throw new Error(
        'Debes indicar hora de inicio y término.'
      )
    }

    if (
      start >= end
    ) {
      throw new Error(
        'La hora de término debe ser posterior a la hora de inicio.'
      )
    }

    const conflict =
      rows.find(
        row => {
          if (
            ignoreId &&
            row.id ===
              ignoreId
          ) {
            return false
          }

          if (
            row.date !==
            date
          ) {
            return false
          }

          const rowStart =
            hhmm(
              row.start_time
            )

          const rowEnd =
            hhmm(
              row.end_time
            )

          return overlaps(
            start,
            end,
            rowStart,
            rowEnd
          )
        }
      )

    if (conflict) {
      throw new Error(
        `Ese horario se cruza con ${hhmm(
          conflict.start_time
        )}–${hhmm(
          conflict.end_time
        )}.`
      )
    }
  }

  /* ======================================================
     AGREGAR
  ====================================================== */

  async function add(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (
      busy ||
      !providerId
      || !selectedCategory
    ) {
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      validateBlock({
        date:
          f.date,
        start:
          f.start,
        end:
          f.end,
      })

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            'provider_availability'
          )
          .insert({
            provider_id:
              providerId,

            category_slug:
              selectedCategory,

            date:
              f.date,

            start_time:
              f.start,

            end_time:
              f.end,

            available:
              true,
          })

      if (
        insertError
      ) {
        throw insertError
      }

      setSuccess(
        'Disponibilidad agregada correctamente.'
      )

      setF(
        DEFAULT_FORM
      )

      await load()
    } catch (
      err: any
    ) {
      console.error(
        'Error agregando disponibilidad:',
        err
      )

      setError(
        err?.message ||
          'No se pudo agregar la disponibilidad.'
      )
    } finally {
      setBusy(false)
    }
  }

  /* ======================================================
     EDITAR
  ====================================================== */

  function startEdit(
    row: AvailabilityRow
  ) {
    setEditingId(
      row.id
    )

    setEditForm({
      date:
        row.date,

      start:
        hhmm(
          row.start_time
        ),

      end:
        hhmm(
          row.end_time
        ),
    })

    setError('')
    setSuccess('')
  }

  function cancelEdit() {
    setEditingId(
      null
    )
  }

  async function saveEdit(
    row: AvailabilityRow
  ) {
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      validateBlock({
        date:
          editForm.date,

        start:
          editForm.start,

        end:
          editForm.end,

        ignoreId:
          row.id,
      })

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            'provider_availability'
          )
          .update({
            date:
              editForm.date,

            start_time:
              editForm.start,

            end_time:
              editForm.end,
          })
          .eq(
            'id',
            row.id
          )

      if (
        updateError
      ) {
        throw updateError
      }

      setEditingId(
        null
      )

      setSuccess(
        'Disponibilidad actualizada.'
      )

      await load()
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'No se pudo actualizar la disponibilidad.'
      )
    } finally {
      setBusy(false)
    }
  }

  /* ======================================================
     DISPONIBLE / BLOQUEADO
  ====================================================== */

  async function toggle(
    row: AvailabilityRow
  ) {
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            'provider_availability'
          )
          .update({
            available:
              !row.available,
          })
          .eq(
            'id',
            row.id
          )

      if (
        updateError
      ) {
        throw updateError
      }

      setSuccess(
        row.available
          ? 'Horario bloqueado.'
          : 'Horario habilitado nuevamente.'
      )

      await load()
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'No se pudo cambiar el estado.'
      )
    } finally {
      setBusy(false)
    }
  }

  /* ======================================================
     DUPLICAR
  ====================================================== */

  function openDuplicate(
    row: AvailabilityRow
  ) {
    setDuplicateRow(
      row
    )

    setDuplicateDate(
      ''
    )

    setError('')
    setSuccess('')
  }

  async function duplicate() {
    if (
      !duplicateRow
    ) {
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const start =
        hhmm(
          duplicateRow.start_time
        )

      const end =
        hhmm(
          duplicateRow.end_time
        )

      validateBlock({
        date:
          duplicateDate,

        start,
        end,
      })

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            'provider_availability'
          )
          .insert({
            provider_id:
              providerId,

            category_slug:
              selectedCategory,

            date:
              duplicateDate,

            start_time:
              start,

            end_time:
              end,

            available:
              duplicateRow.available,
          })

      if (
        insertError
      ) {
        throw insertError
      }

      setDuplicateRow(
        null
      )

      setDuplicateDate(
        ''
      )

      setSuccess(
        'Horario duplicado correctamente.'
      )

      await load()
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'No se pudo duplicar el horario.'
      )
    } finally {
      setBusy(false)
    }
  }

  /* ======================================================
     ELIMINAR
  ====================================================== */

  async function remove(
    id: string
  ) {
    const confirmed =
      window.confirm(
        '¿Eliminar esta disponibilidad?'
      )

    if (
      !confirmed
    ) {
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            'provider_availability'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        deleteError
      ) {
        throw deleteError
      }

      setSuccess(
        'Disponibilidad eliminada.'
      )

      await load()
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'No se pudo eliminar la disponibilidad.'
      )
    } finally {
      setBusy(false)
    }
  }

  /* ======================================================
     LOADING
  ====================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />

          Cargando disponibilidad...
        </div>
      </div>
    )
  }

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">

      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            Prestador
          </p>

          <h1 className="mt-1 text-3xl font-extrabold">
            Disponibilidad
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Define cuándo puedes recibir eventos.
            Brasa cruzará estos horarios con la
            duración de tus servicios y tus reservas
            existentes.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              '/prestador/dashboard'
            )
          }
        >
          Ir al dashboard

          <ArrowRight />
        </Button>
      </div>

      {/* MENSAJES */}

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

      {/* EXPLICACIÓN */}

      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />

          <div>
            <p className="font-semibold">
              ¿Cómo usa Brasa estos horarios?
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Si indicas disponibilidad de 12:00 a
              23:00 y un servicio dura 5 horas,
              Brasa solo ofrecerá horas de inicio
              donde el servicio pueda terminar antes
              de las 23:00 y no choque con otra
              reserva.
            </p>
          </div>
        </div>
      </div>

      <label className="mt-6 grid max-w-sm gap-1.5 text-sm">
        Categoría que quieres configurar
        <select
          className="h-10 rounded-lg border bg-background px-3"
          value={selectedCategory}
          disabled={busy}
          onChange={(event) => {
            setEditingId(null)
            setSelectedCategory(event.target.value)
          }}
        >
          {providerCategories.map((categorySlug) => (
            <option key={categorySlug} value={categorySlug}>
              {categorySlug}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">

        {/* ===============================================
            NUEVA DISPONIBILIDAD
        =============================================== */}

        <Card className="self-start">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays />
            </div>

            <CardTitle className="mt-2">
              Agregar disponibilidad
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={add}
              className="space-y-4"
            >
              <label className="grid gap-1.5 text-sm">
                Fecha

                <Input
                  type="date"
                  required
                  min={today}
                  disabled={busy}
                  value={f.date}
                  onChange={e =>
                    setF({
                      ...f,
                      date:
                        e.target.value,
                    })
                  }
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm">
                  Desde

                  <Input
                    type="time"
                    required
                    disabled={busy}
                    value={f.start}
                    onChange={e =>
                      setF({
                        ...f,
                        start:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  Hasta

                  <Input
                    type="time"
                    required
                    disabled={busy}
                    value={f.end}
                    onChange={e =>
                      setF({
                        ...f,
                        end:
                          e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                Puedes crear varios bloques en un
                mismo día, siempre que no se
                superpongan.
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Plus />
                )}

                {busy
                  ? 'Guardando...'
                  : 'Agregar horario'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ===============================================
            PRÓXIMAS FECHAS
        =============================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Próximas fechas
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            {rows.map(
              row => {
                const editing =
                  editingId ===
                  row.id

                return (
                  <div
                    key={
                      row.id
                    }
                    className="rounded-xl border p-4 transition hover:bg-muted/20"
                  >
                    {editing ? (
                      /* ============================
                         EDICIÓN
                      ============================ */
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="grid gap-1 text-xs">
                            Fecha

                            <Input
                              type="date"
                              min={
                                today
                              }
                              value={
                                editForm.date
                              }
                              onChange={e =>
                                setEditForm({
                                  ...editForm,
                                  date:
                                    e.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="grid gap-1 text-xs">
                            Desde

                            <Input
                              type="time"
                              value={
                                editForm.start
                              }
                              onChange={e =>
                                setEditForm({
                                  ...editForm,
                                  start:
                                    e.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="grid gap-1 text-xs">
                            Hasta

                            <Input
                              type="time"
                              value={
                                editForm.end
                              }
                              onChange={e =>
                                setEditForm({
                                  ...editForm,
                                  end:
                                    e.target.value,
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={
                              cancelEdit
                            }
                          >
                            <X />

                            Cancelar
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              saveEdit(
                                row
                              )
                            }
                          >
                            <Check />

                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ============================
                         VISUALIZACIÓN
                      ============================ */
                      <div className="flex flex-wrap items-center justify-between gap-4">

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="capitalize">
                              {formatDate(
                                row.date
                              )}
                            </b>

                            <span
                              className={
                                row.available
                                  ? 'rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'
                                  : 'rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
                              }
                            >
                              {row.available
                                ? 'Disponible'
                                : 'Bloqueado'}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="size-4" />

                            {hhmm(
                              row.start_time
                            )}

                            {' – '}

                            {hhmm(
                              row.end_time
                            )}
                          </div>
                        </div>

                        {/* ACCIONES */}

                        <div className="flex flex-wrap gap-2">

                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            title="Editar"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              startEdit(
                                row
                              )
                            }
                          >
                            <Pencil />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            title="Duplicar a otra fecha"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              openDuplicate(
                                row
                              )
                            }
                          >
                            <Copy />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            title={
                              row.available
                                ? 'Bloquear horario'
                                : 'Habilitar horario'
                            }
                            disabled={
                              busy
                            }
                            onClick={() =>
                              toggle(
                                row
                              )
                            }
                          >
                            <Power />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            title="Eliminar disponibilidad"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              remove(
                                row.id
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* DUPLICAR */}

                    {duplicateRow?.id ===
                      row.id && (
                      <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                        <p className="text-sm font-semibold">
                          Duplicar este horario
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {hhmm(
                            row.start_time
                          )}
                          {' – '}
                          {hhmm(
                            row.end_time
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Input
                            type="date"
                            min={
                              today
                            }
                            value={
                              duplicateDate
                            }
                            onChange={e =>
                              setDuplicateDate(
                                e.target.value
                              )
                            }
                            className="max-w-[220px]"
                          />

                          <Button
                            type="button"
                            disabled={
                              busy ||
                              !duplicateDate
                            }
                            onClick={
                              duplicate
                            }
                          >
                            <Copy />

                            Duplicar
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setDuplicateRow(
                                null
                              )
                            }
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            )}

            {rows.length ===
              0 && (
              <div className="py-12 text-center">
                <CalendarDays className="mx-auto size-9 text-muted-foreground/50" />

                <p className="mt-3 font-medium">
                  No has definido fechas
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Agrega al menos una fecha para
                  comenzar a recibir solicitudes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
