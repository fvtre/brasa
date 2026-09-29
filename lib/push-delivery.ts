import 'server-only'

import { sendWebPush } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'

type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function shouldRetryPush(error: any) {
  const statusCode = Number(error?.statusCode || 0)
  return statusCode === 0 || statusCode === 408 || statusCode === 429 || statusCode >= 500
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

export async function releasePushEvent(eventKey: string, userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('push_event_deliveries')
    .delete()
    .eq('event_key', eventKey)
    .eq('user_id', userId)
  if (error) throw error
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
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await sendWebPush(subscription, payload)
        sent += 1
        break
      } catch (pushError: any) {
        const statusCode = Number(pushError?.statusCode || 0)
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
          break
        }
        if (attempt === 3 || !shouldRetryPush(pushError)) {
          console.error('Web Push delivery:', pushError)
          break
        }
        await wait(attempt * 400)
      }
    }
  }

  return sent
}
