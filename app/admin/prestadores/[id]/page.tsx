import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

import { AdminProviderManager } from '@/components/admin-provider-manager'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function todayInSantiago() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default async function AdminProviderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [providerResult, categoriesResult, servicesResult, availabilityResult] = await Promise.all([
    supabase.from('service_providers').select('*').eq('id', id).maybeSingle(),
    supabase.from('provider_categories').select('category_slug').eq('provider_id', id).order('category_slug'),
    supabase.from('provider_services').select('id,name,category_slug,price,unit,active').eq('provider_id', id).order('category_slug').order('name'),
    supabase.from('provider_availability').select('id,provider_id,category_slug,date,start_time,end_time,available,notes').eq('provider_id', id).gte('date', todayInSantiago()).order('date').order('start_time'),
  ])

  if (providerResult.error) throw new Error(providerResult.error.message)
  if (!providerResult.data) notFound()
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (servicesResult.error) throw new Error(servicesResult.error.message)
  if (availabilityResult.error) throw new Error(availabilityResult.error.message)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/admin/prestadores" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Volver a prestadores
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold text-primary">Centro de incidencias</p>
        <h1 className="mt-1 text-3xl font-extrabold">{providerResult.data.business_name}</h1>
        <p className="mt-2 text-muted-foreground">Los cambios se aplican al perfil real del prestador.</p>
      </div>

      <AdminProviderManager
        initialProvider={providerResult.data}
        categories={(categoriesResult.data || []).map(row => row.category_slug)}
        initialServices={servicesResult.data || []}
        initialAvailability={availabilityResult.data || []}
      />
    </main>
  )
}
