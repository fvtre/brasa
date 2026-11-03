import 'server-only'
import type { AppProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function recordSecurityAudit(profile: AppProfile, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const supabase = await createClient()
  const { error } = await supabase.from('security_audit_events').insert({ actor_id: profile.id, actor_role: profile.role, action, entity_type: entityType, entity_id: entityId || null, metadata })
  if (error) console.error('security_audit_events:', error.message)
}
