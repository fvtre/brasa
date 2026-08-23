import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'cliente' | 'prestador' | 'administrador'

export type AppProfile = {
  id: string
  full_name: string | null
  email: string | null
  role: AppRole
  phone: string | null
  comuna: string | null
  avatar_url: string | null
  active?: boolean
}

export async function getCurrentProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  // Repara/crea el perfil si el trigger no alcanzó a crearlo o quedó con rol desactualizado.
  // La RPC nunca permite autoasignarse administrador.
  const { error: ensureError } = await supabase.rpc('ensure_my_profile')
  if (ensureError) {
    console.error('ensure_my_profile:', ensureError.message)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,full_name,email,role,phone,comuna,avatar_url,active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('No se pudo leer profiles:', profileError.message)
    return null
  }

  if (!profile) return null

  return {
    user,
    profile: profile as AppProfile,
  }
}

export async function requireRole(roles: AppRole[]) {
  const session = await getCurrentProfile()

  if (!session) redirect('/login')
  if (!session.profile.active) redirect('/login?error=Cuenta%20desactivada')
  if (!roles.includes(session.profile.role)) redirect('/cuenta')

  return session
}

export function roleHome(role: AppRole) {
  if (role === 'administrador') return '/admin/dashboard'
  if (role === 'prestador') return '/prestador/dashboard'
  return '/cliente/dashboard'
}
