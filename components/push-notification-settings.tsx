'use client'

import * as React from 'react'
import { Bell, BellRing, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

export function PushNotificationSettings() {
  const [supported, setSupported] = React.useState(true)
  const [enabled, setEnabled] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const available =
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setSupported(available)
    if (!available) return

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => setSupported(false))
  }, [])

  async function enablePush() {
    setBusy(true)
    setMessage(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('Permiso de notificaciones bloqueado en el teléfono.')
        return
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) throw new Error('Falta configurar la clave pública de notificaciones.')

      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }))

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'No se pudo activar el push.')
      }

      setEnabled(true)
      setMessage('Te avisaremos cuando llegue una nueva reserva.')
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo activar el push.')
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {enabled ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div>
          <p className="font-semibold">Avisos de nuevas reservas</p>
          <p className="text-sm text-muted-foreground">
            {message || (enabled ? 'Notificaciones activadas en este dispositivo.' : 'Recibe un aviso aunque Brasa esté cerrada.')}
          </p>
        </div>
      </div>
      {!enabled && (
        <Button type="button" size="sm" onClick={enablePush} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Bell />}
          Activar avisos
        </Button>
      )}
    </div>
  )
}
