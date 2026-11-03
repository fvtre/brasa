import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export default async function AuditPage() {
  await requireRole(['administrador'])
  const supabase = await createClient()
  const { data, error } = await supabase.from('security_audit_events').select('id,action,entity_type,entity_id,outcome,actor_role,created_at,actor:profiles(full_name,email)').order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return <main className="mx-auto max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-primary">Administración</p><h1 className="mt-1 text-3xl font-extrabold">Auditoría de seguridad</h1><p className="mt-2 text-muted-foreground">Historial inmutable de acciones sensibles. No registra contraseñas, tokens ni direcciones IP.</p><div className="mt-8 overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Fecha</th><th className="p-3">Actor</th><th className="p-3">Acción</th><th className="p-3">Entidad</th><th className="p-3">Resultado</th></tr></thead><tbody>{(data || []).map((row: any) => { const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor; return <tr key={row.id} className="border-t"><td className="p-3">{new Date(row.created_at).toLocaleString('es-CL')}</td><td className="p-3">{actor?.full_name || actor?.email || row.actor_role}</td><td className="p-3 font-medium">{row.action}</td><td className="p-3">{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ''}</td><td className="p-3 capitalize">{row.outcome}</td></tr>})}</tbody></table></div></main>
}
