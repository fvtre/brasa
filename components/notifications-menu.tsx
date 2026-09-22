'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell } from 'lucide-react'
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
        <div className="fixed inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] z-[100] max-h-[min(70dvh,28rem)] overflow-y-auto rounded-xl border bg-popover shadow-xl sm:left-auto sm:right-4 sm:w-80">
          <div className="border-b p-3 text-sm font-semibold">Notificaciones</div>
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
        </div>,
        document.body,
      )}
    </div>
  )
}
