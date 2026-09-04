import 'server-only'

import webpush from 'web-push'

export type StoredPushSubscription = {
  endpoint: string
  p256dh: string
  auth: string
}

let configured = false

function configureWebPush() {
  if (configured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    throw new Error('Faltan las claves VAPID para Web Push')
  }

  webpush.setVapidDetails(
    'mailto:adrianoduque3@gmail.com',
    publicKey,
    privateKey,
  )
  configured = true
}

export async function sendWebPush(
  subscription: StoredPushSubscription,
  payload: {
    title: string
    body: string
    url: string
    tag: string
  },
) {
  configureWebPush()

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify({
      ...payload,
      icon: '/brasa-meta-icon-1024.png',
      badge: '/brasa-meta-icon-1024.png',
    }),
  )
}
