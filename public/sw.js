self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Brasa', {
      body: data.body || 'Tienes una nueva notificación.',
      icon: data.icon || '/brasa-meta-icon-1024.png',
      badge: data.badge || '/brasa-meta-icon-1024.png',
      tag: data.tag || 'brasa-notification',
      renotify: true,
      vibrate: [150, 80, 150],
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(destination)
          return client.focus()
        }
      }
      return clients.openWindow(destination)
    }),
  )
})
