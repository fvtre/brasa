'use client'

import { useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AppRole = 'cliente' | 'prestador' | 'administrador'

export type AdminUser = {
  id: string
  full_name: string | null
  email: string | null
  role: AppRole
  active: boolean
  created_at: string
}

export function AdminUserManager({ users: initialUsers, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [users, setUsers] = useState(initialUsers)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function updateUser(user: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'active'>>) {
    if (user.id === currentUserId) return setMessage('Tu propia cuenta administradora está protegida.')
    if (!window.confirm(`¿Guardar cambios para ${user.email || user.full_name || 'esta cuenta'}?`)) return

    setWorkingId(user.id)
    setMessage('')
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) setMessage(error.message)
    else {
      setUsers(current => current.map(row => row.id === user.id ? { ...row, ...patch } : row))
      setMessage('Cuenta actualizada correctamente.')
    }
    setWorkingId(null)
  }

  return <Card className="mt-8">
    <CardHeader><CardTitle>{users.length} cuentas</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {message && <p className="rounded-lg border bg-muted/40 p-3 text-sm">{message}</p>}
      {users.map(user => {
        const ownAccount = user.id === currentUserId
        return <article key={user.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_160px_auto] md:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><b>{user.full_name || 'Sin nombre'}</b>{ownAccount && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Tu cuenta</span>}{!user.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Desactivada</span>}</div><p className="mt-1 text-sm text-muted-foreground">{user.email || 'Sin correo'} · Creada {new Date(user.created_at).toLocaleDateString('es-CL')}</p></div>
          <select className="h-9 rounded-lg border bg-background px-3 text-sm capitalize" value={user.role} disabled={ownAccount || workingId === user.id} onChange={event => updateUser(user, { role: event.target.value as AppRole })}><option value="cliente">Cliente</option><option value="prestador">Prestador</option><option value="administrador">Administrador</option></select>
          <Button variant={user.active ? 'destructive' : 'default'} disabled={ownAccount || workingId === user.id} onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Desactivar' : 'Reactivar'}</Button>
        </article>
      })}
    </CardContent>
  </Card>
}
