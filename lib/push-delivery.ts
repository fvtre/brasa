import 'server-only'

import { sendWebPush } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'

type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

export async function claimPushEvent(eventKey: string, userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('push_event_deliveries').insert({
    event_key: eventKey,
    user_id: userId,
  })

  if (error?.code === '23505') return false
  if (error) throw error
  return true
}

export async function deliverPushToUser(userId: string, payload: PushPayload) {
  const admin = createAdminClient()
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', userId)

  if (error) throw error

  let sent = 0
  for (const subscription of subscriptions || []) {
    try {
      await sendWebPush(subscription, payload)
      sent += 1
    } catch (pushError: any) {
      const statusCode = Number(pushError?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        continue
      }
      console.error('Web Push delivery:', pushError)
    }
  }

  return sent
}
