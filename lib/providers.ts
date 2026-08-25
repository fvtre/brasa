import type {
  CategorySlug,
  Provider,
} from "./types"

/*
 * =========================================================
 * PRESTADORES ESTÁTICOS
 * =========================================================
 *
 * Brasa ya utiliza Supabase como fuente real de prestadores.
 *
 * Dejamos este array vacío para mantener compatibilidad
 * con componentes antiguos que todavía importan PROVIDERS.
 *
 * No agregar nuevos prestadores aquí.
 * Todos deben crearse en service_providers.
 */

export const PROVIDERS: Provider[] = []

export function getProvider(
  id: string
): Provider | undefined {
  return PROVIDERS.find(
    provider =>
      provider.id === id
  )
}

export function getProvidersByCategory(
  category: CategorySlug
): Provider[] {
  return PROVIDERS.filter(
    provider =>
      provider.categories.includes(category)
  )
}
