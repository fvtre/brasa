import { redirect } from 'next/navigation'
import { MfaManager } from '@/components/mfa-manager'
import { getCurrentProfile } from '@/lib/auth'

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const session = await getCurrentProfile()
  if (!session) redirect('/login')
  const query = await searchParams
  return <main className="mx-auto max-w-3xl px-4 py-10"><p className="text-sm font-semibold text-primary">Seguridad de la cuenta</p><h1 className="mt-1 text-3xl font-extrabold">Protege tu acceso</h1><p className="mt-2 text-muted-foreground">El segundo factor reduce el riesgo de acceso aunque una contraseña sea comprometida.</p><MfaManager required={query.required === '1' || session.profile.role === 'administrador'} /></main>
}
