import { AdminUserManager, type AdminUser } from '@/components/admin-user-manager'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminUsers() {
  const session = await requireRole(['administrador'])
  const supabase = await createClient()
  const { data: rows, error } = await supabase.from('profiles').select('id,full_name,email,role,active,created_at').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <p className="text-sm font-semibold text-primary">Administración</p>
    <h1 className="mt-1 text-3xl font-extrabold">Usuarios</h1>
    <p className="mt-2 text-muted-foreground">Administra roles y acceso. Las cuentas se desactivan en vez de borrar su historial.</p>
    <AdminUserManager users={(rows || []) as AdminUser[]} currentUserId={session.user.id} />
  </main>
}
