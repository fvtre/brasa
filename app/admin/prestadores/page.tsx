import Link from 'next/link'
import { Settings2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AdminProviders() {
  const supabase = await createClient()
  const { data: providers, error } = await supabase
    .from('service_providers')
    .select('id,business_name,slug,category_slug,comuna,rating,verified,featured,active')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold text-primary">Administración</p>
      <h1 className="mt-1 text-3xl font-extrabold">Prestadores</h1>
      <p className="mt-2 text-muted-foreground">
        Supervisa perfiles y entra al centro de incidencias para corregir agenda y servicios.
      </p>

      <Card className="mt-8">
        <CardHeader><CardTitle>{providers?.length || 0} perfiles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(providers || []).map(provider => (
            <article key={provider.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <b>{provider.business_name}</b>
                  {provider.verified && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Verificado</span>}
                  {provider.featured && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700">Destacado</span>}
                  {!provider.active && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-700">Desactivado</span>}
                </div>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {provider.category_slug} · {provider.comuna || 'Sin comuna'} · ⭐ {provider.rating}
                </p>
              </div>

              <Button nativeButton={false} render={<Link href={`/admin/prestadores/${provider.id}`} />}>
                <Settings2 /> Gestionar incidencia
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
