'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'

type NotificationRow = {
  id: string
  href: string | null
  title: string
  body: string | null
}

export function NotificationsMenu() {
  const { user } = useAuth()
  const supabase = React.useMemo(() => createClient(), [])
  const [rows, setRows] = React.useState<NotificationRow[]>([])
  const [open, setOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!user) {
      setRows([])
      return
    }

    const { data } = await supabase
      .from('notifications')
      .select('id,href,title,body')
      .eq('user_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(8)

    setRows(data || [])
  }, [supabase, user])

  React.useEffect(() => {
    void load()
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => { void load() })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [load, supabase, user])

  React.useEffect(() => {
    if (!user) return
    const refresh = () => { if (!document.hidden) void load() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [load, user])

  if (!user) return null

  async function mark(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    await load()
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(value => !value)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="relative"
      >
        <Bell />
        {rows.length > 0 && (
          <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-white">
            {rows.length}
          </span>
        )}
      </Button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones"
            className="max-h-[min(75dvh,32rem)] overflow-hidden rounded-2xl border bg-popover shadow-2xl"
            style={{
              position: 'fixed',
              top: 'calc(4.5rem + env(safe-area-inset-top))',
              right: 'max(0.75rem, env(safe-area-inset-right))',
              left: 'auto',
              width: 'min(24rem, calc(100vw - 1.5rem))',
              zIndex: 2147483647,
            }}
          >
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-semibold">Notificaciones</span>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="size-4" />
              </Button>
            </div>
            <div className="max-h-[calc(min(75dvh,32rem)-3.5rem)] overflow-y-auto overscroll-contain">
              {rows.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">Sin notificaciones nuevas.</p>
              ) : rows.map(notification => (
                <Link
                  key={notification.id}
                  href={notification.href || '/cuenta'}
                  onClick={() => { void mark(notification.id) }}
                  className="block border-b p-3 hover:bg-muted"
                >
                  <b className="text-sm">{notification.title}</b>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{notification.body}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
