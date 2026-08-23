import type { Provider, CategorySlug } from '@/lib/types'
import { getCategory } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/server'

export async function getDbProviders(): Promise<Provider[]> {
  try {
    const supabase = await createClient()
    const { data: rows } = await supabase.from('service_providers').select('*,services:provider_services(*)').eq('active', true)
    return (rows || []).map(mapDbProvider)
  } catch {
    return []
  }
}

export async function getDbProvider(slug: string): Promise<Provider | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('service_providers').select('*,services:provider_services(*),reviews(rating,comment,created_at)').eq('slug', slug).eq('active', true).maybeSingle()
    return data ? mapDbProvider(data) : null
  } catch {
    return null
  }
}

function mapDbProvider(row: any): Provider {
  const category = (row.category_slug || 'catering') as CategorySlug
  const cat = getCategory(category)
  const services = (row.services || []).filter((s:any)=>s.active !== false).map((s:any)=>({ id: s.external_key || s.id, name:s.name, description:s.description || '', price:Number(s.price||0), unit:s.unit||'por evento', popular:!!s.popular }))
  const priceFrom = services.length ? Math.min(...services.map((s:any)=>s.price)) : 0
  return {
    id: row.slug || row.id,
    name: row.business_name,
    category,
    comuna: row.comuna || 'Santiago',
    region: row.region || 'Región Metropolitana',
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews_count || (row.reviews?.length ?? 0)),
    priceFrom,
    verified: !!row.verified,
    featured: !!row.featured,
    image: row.image_url || cat?.image || '/placeholder.jpg',
    gallery: row.gallery?.length ? row.gallery : [row.image_url || cat?.image || '/placeholder.jpg'],
    tagline: row.tagline || cat?.tagline || 'Servicios para tu evento',
    bio: row.bio || 'Prestador registrado en Brasa.',
    experienceYears: Number(row.experience_years || 0),
    eventsDone: Number(row.events_done || 0),
    coverage: row.coverage?.length ? row.coverage : [row.comuna].filter(Boolean),
    availableDays: [0,1,2,3,4,5,6],
    services,
    reviewList: (row.reviews || []).map((r:any)=>({author:'Cliente Brasa',rating:Number(r.rating),date:new Date(r.created_at).toLocaleDateString('es-CL',{month:'short',year:'numeric'}),comment:r.comment||''})),
  }
}
