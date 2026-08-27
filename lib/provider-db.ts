import type {
  Provider,
  CategorySlug,
  ProviderService,
  ProviderCategoryProfile,
  Review,
} from '@/lib/types'

import { getCategory } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/server'

export async function getDbProviders(
  categorySlug?: CategorySlug
): Promise<Provider[]> {
  try {
    const supabase = await createClient()

    const {
      data: rows,
      error,
    } = await supabase
      .from('service_providers')
      .select(`
        *,
        categories:provider_categories(
          category_slug,
          description,
          cover_image_url,
          gallery:provider_category_gallery(image_url,sort_order,created_at)
        ),
        services:provider_services(*),
        availability:provider_availability(*)
      `)
      .eq('active', true)
      .order('featured', {
        ascending: false,
      })
      .order('verified', {
        ascending: false,
      })
      .order('rating', {
        ascending: false,
      })

    if (error) {
      console.error(
        'Error cargando prestadores:',
        error
      )

      return []
    }

    return (rows || []).map((row) =>
      mapDbProvider(row, categorySlug)
    )
  } catch (error) {
    console.error(
      'Error inesperado cargando prestadores:',
      error
    )

    return []
  }
}

export async function getDbProvider(
  slug: string,
  categorySlug?: CategorySlug
): Promise<Provider | null> {
  try {
    const supabase = await createClient()

    const {
      data,
      error,
    } = await supabase
      .from('service_providers')
      .select(`
        *,
        categories:provider_categories(
          category_slug,
          description,
          cover_image_url,
          gallery:provider_category_gallery(image_url,sort_order,created_at)
        ),
        services:provider_services(*),
        availability:provider_availability(*),
        reviews(
          rating,
          comment,
          created_at
        )
      `)
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (error) {
      console.error(
        `Error cargando prestador ${slug}:`,
        error
      )

      return null
    }

    if (!data) {
      return null
    }

    return mapDbProvider(data, categorySlug)
  } catch (error) {
    console.error(
      `Error inesperado cargando prestador ${slug}:`,
      error
    )

    return null
  }
}

function mapDbProvider(
  row: any,
  requestedCategory?: CategorySlug
): Provider {
  const legacyCategory =
    (
      row.category_slug ||
      'catering'
    ) as CategorySlug

  const category =
    requestedCategory &&
    (row.categories || []).some(
      (item: any) => item.category_slug === requestedCategory
    )
      ? requestedCategory
      : legacyCategory

  const categoryData = getCategory(category)

  const categories = Array.from(
    new Set<CategorySlug>([
      legacyCategory,
      ...(row.categories || [])
        .map((item: any) => item.category_slug)
        .filter(Boolean),
    ])
  )

  // ============================================
  // SERVICIOS
  // ============================================

  const services: ProviderService[] =
    (row.services || [])
      .filter(
        (service: any) =>
          service.active !== false &&
          (!requestedCategory || service.category_slug === category)
      )
      .sort(
        (a: any, b: any) =>
          Number(a.price || 0) -
          Number(b.price || 0)
      )
      .map((service: any) => ({
        id:
          service.external_key ||
          service.id,

        category_slug:
          (service.category_slug || legacyCategory) as CategorySlug,

        name:
          service.name ||
          'Servicio',

        description:
          service.description || '',

        price:
          Number(
            service.price || 0
          ),

        unit:
          service.unit ||
          'por evento',

        popular:
          Boolean(
            service.popular
          ),

        // ==========================================
        // CAPACIDAD
        // ==========================================

        min_guests:
          service.min_guests != null
            ? Number(
              service.min_guests
            )
            : null,

        max_guests:
          service.max_guests != null
            ? Number(
              service.max_guests
            )
            : null,

        // ==========================================
        // DURACIÓN
        // ==========================================

        duration_hours:
          service.duration_hours != null
            ? Number(
              service.duration_hours
            )
            : null,

        extra_hour_price:
          Number(
            service.extra_hour_price ||
            0
          ),

        schedule_mode:
          service.schedule_mode ||
          'continuous',

        inventory_capacity:
          service.inventory_capacity != null
            ? Number(service.inventory_capacity)
            : null,

        buffer_before_minutes:
          Number(service.buffer_before_minutes || 0),

        buffer_after_minutes:
          Number(service.buffer_after_minutes || 0),

        // ==========================================
        // PARRILLA
        // ==========================================

        grill_available:
          Boolean(
            service.grill_available
          ),

        grill_price:
          Number(
            service.grill_price ||
            0
          ),

        // ==========================================
        // TRASLADO
        // ==========================================

        transport_available:
          Boolean(
            service.transport_available
          ),

        transport_price:
          Number(
            service.transport_price ||
            0
          ),

        // ==========================================
        // GESTIÓN DE COMPRAS
        // ==========================================

        shopping_available:
          Boolean(
            service.shopping_available
          ),

        shopping_fee_type:
          service.shopping_fee_type ||
          'fixed',

        shopping_fee:
          Number(
            service.shopping_fee ||
            0
          ),

        // ==========================================
        // FULL BRASA
        // ==========================================

        full_package_enabled:
          Boolean(
            service.full_package_enabled
          ),

        full_package_discount_type:
          service.full_package_discount_type ||
          'percentage',

        full_package_discount:
          Number(
            service.full_package_discount ||
            0
          ),

        // ==========================================
        // INCLUYE / NO INCLUYE
        // ==========================================

        includes:
          Array.isArray(
            service.includes
          )
            ? service.includes
            : [],

        excludes:
          Array.isArray(
            service.excludes
          )
            ? service.excludes
            : [],
      }))

  const priceFrom =
    services.length > 0
      ? Math.min(
        ...services.map(
          (service) =>
            service.price
        )
      )
      : 0

  // ============================================
  // FOTO PRINCIPAL
  // ============================================

  const selectedCategoryRow =
    (row.categories || []).find(
      (item: any) => item.category_slug === category
    )

  const fallbackImage =
    categoryData?.image ||
    '/placeholder.jpg'

  const image =
    selectedCategoryRow?.cover_image_url ||
    (category === legacyCategory ? row.image_url : null) ||
    fallbackImage

  // ============================================
  // GALERÍA
  // ============================================

  const categoryGallery =
    (selectedCategoryRow?.gallery || [])
      .sort((a: any, b: any) =>
        Number(a.sort_order || 0) - Number(b.sort_order || 0)
      )
      .map((item: any) => item.image_url)
      .filter(Boolean)

  const rawGallery = requestedCategory
    ? categoryGallery.length > 0
      ? categoryGallery
      : category === legacyCategory && Array.isArray(row.gallery)
        ? row.gallery.filter(Boolean)
        : []
    : categoryGallery.length > 0
      ? categoryGallery
      : Array.isArray(row.gallery)
        ? row.gallery.filter(Boolean)
        : []

  // Si tiene foto principal pero esa foto
  // todavía no está en gallery, la ponemos
  // primera para tener una galería consistente.
  const gallery = [
    image,
    ...rawGallery.filter(
      (url: string) =>
        url !== image
    ),
  ]

  // ============================================
  // DISPONIBILIDAD REAL
  // ============================================

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const categoryAvailability =
    (row.availability || []).filter(
      (item: any) => item.category_slug === category
    )

  const effectiveAvailability = categoryAvailability.length > 0
    ? categoryAvailability
    : (row.availability || []).filter(
        (item: any) => item.category_slug == null
      )

  const availableDays: number[] =
    Array.from(
      new Set<number>(
        effectiveAvailability
          .filter(
            (availability: any) => {
              if (
                availability.available ===
                false
              ) {
                return false
              }

              if (
                !availability.date
              ) {
                return false
              }

              const date =
                new Date(
                  `${availability.date}T12:00:00`
                )

              return (
                !Number.isNaN(
                  date.getTime()
                ) &&
                date >= today
              )
            }
          )
          .map(
            (
              availability: any
            ) => {
              const date =
                new Date(
                  `${availability.date}T12:00:00`
                )

              return date.getDay()
            }
          )
      )
    ).sort(
      (a, b) => a - b
    )

  // ============================================
  // RESEÑAS
  // ============================================

  const reviewList: Review[] =
    (row.reviews || [])
      .sort(
        (a: any, b: any) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )
      .map((review: any) => ({
        author:
          'Cliente Brasa',

        rating:
          Number(
            review.rating || 0
          ),

        date:
          review.created_at
            ? new Date(
              review.created_at
            ).toLocaleDateString(
              'es-CL',
              {
                month:
                  'short',
                year:
                  'numeric',
              }
            )
            : '',

        comment:
          review.comment || '',
      }))

  const categoryProfiles: ProviderCategoryProfile[] =
    (row.categories || []).map((item: any) => ({
      category_slug: item.category_slug as CategorySlug,
      description: item.description || '',
      coverImage:
        item.cover_image_url ||
        getCategory(item.category_slug)?.image ||
        '/placeholder.jpg',
      gallery: (item.gallery || [])
        .sort((a: any, b: any) =>
          Number(a.sort_order || 0) - Number(b.sort_order || 0)
        )
        .map((galleryItem: any) => galleryItem.image_url)
        .filter(Boolean),
      availableDays: [],
    }))

  // ============================================
  // PROVIDER FINAL
  // ============================================

  return {
    // Usamos slug porque las rutas públicas son
    // /proveedores/[slug]
    id:
      row.slug ||
      row.id,

    name:
      row.business_name ||
      'Prestador Brasa',

    category,

    categories,

    categoryProfiles,

    comuna:
      row.comuna ||
      'Santiago',

    region:
      row.region ||
      'Región Metropolitana',

    rating:
      Number(
        row.rating || 0
      ),

    reviews:
      Number(
        row.reviews_count ||
        reviewList.length
      ),

    priceFrom,

    verified:
      Boolean(
        row.verified
      ),

    featured:
      Boolean(
        row.featured
      ),

    image,

    gallery,

    tagline:
      row.tagline ||
      categoryData?.tagline ||
      'Servicios para tu evento',

    bio:
      selectedCategoryRow?.description ||
      row.bio ||
      'Prestador registrado en Brasa.',

    experienceYears:
      Number(
        row.experience_years ||
        0
      ),

    eventsDone:
      Number(
        row.events_done ||
        0
      ),

    coverage:
      Array.isArray(
        row.coverage
      ) &&
        row.coverage.length > 0
        ? row.coverage
        : row.comuna
          ? [row.comuna]
          : [],

    availableDays,

    services,

    reviewList,
  }
}
