import { redirect } from 'next/navigation'
import { getCurrentProfile, roleHome } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function CuentaPage() {
  const session = await getCurrentProfile()
  if (!session) redirect('/login?error=No%20se%20pudo%20cargar%20tu%20perfil')
  redirect(roleHome(session.profile.role))
}
