'use client'

import * as React from 'react'
import { ArrowLeft, MessageCircle, MessagesSquare, Send } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Conversation = {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  booking: { code: string; event_name: string; event_date: string; contact_name: string } | null
  provider: { business_name: string } | null
}

type ChatMessage = { id: string; sender_id: string; body: string; created_at: string }

export default function MessagesPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const { user, loading } = useAuth()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [selected, setSelected] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [text, setText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState('')
  const [requestedBooking, setRequestedBooking] = React.useState('')
  const [showMobileList, setShowMobileList] = React.useState(false)

  React.useEffect(() => {
    setRequestedBooking(new URLSearchParams(window.location.search).get('booking') || '')
  }, [])

  const loadConversations = React.useCallback(async () => {
    if (!user) return
    const { data, error: queryError } = await supabase
      .from('conversations')
      .select('id,booking_id,client_id,provider_id,booking:bookings(code,event_name,event_date,contact_name),provider:service_providers(business_name)')
      .order('created_at', { ascending: false })

    if (queryError) return setError(queryError.message)
    const rows = (data || []).map((row) => ({
      ...row,
      booking: Array.isArray(row.booking) ? row.booking[0] || null : row.booking,
      provider: Array.isArray(row.provider) ? row.provider[0] || null : row.provider,
    })) as Conversation[]

    setConversations(rows)
    setSelected((current) => {
      const requested = requestedBooking
        ? rows.find((row) => row.booking_id === requestedBooking)
        : null
      if (requested) return requested.id
      return current && rows.some((row) => row.id === current) ? current : rows[0]?.id || ''
    })
  }, [requestedBooking, supabase, user])

  const loadMessages = React.useCallback(async () => {
    if (!selected) return setMessages([])
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('id,sender_id,body,created_at')
      .eq('conversation_id', selected)
      .order('created_at')

    if (queryError) return setError(queryError.message)
    setMessages(data || [])
  }, [supabase, selected])

  React.useEffect(() => { void loadConversations() }, [loadConversations])
  React.useEffect(() => {
    void loadMessages()
    if (!selected) return
    const channel = supabase
      .channel(`conversation-${selected}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected}` }, loadMessages)
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [selected, loadMessages, supabase])

  async function send() {
    if (!text.trim() || !selected || !user || sending) return
    setSending(true)
    setError('')
    const body = text.trim()
    const { data: created, error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: selected, sender_id: user.id, body })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setText('')
      await loadMessages()
      try {
        const response = await fetch('/api/push/message-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: created.id }),
        })
        if (!response.ok) console.error('El mensaje se envió, pero falló el aviso:', await response.text())
      } catch (notificationError) {
        console.error('El mensaje se envió, pero no se pudo enviar el aviso:', notificationError)
      }
    }
    setSending(false)
  }

  if (!loading && !user) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><MessageCircle className="mx-auto size-8 text-primary" /><h1 className="mt-4 text-2xl font-bold">Inicia sesión para ver tus mensajes</h1></div>
  }

  const selectedConversation = conversations.find((conversation) => conversation.id === selected)
  const selectedCounterpart = selectedConversation
    ? user?.id === selectedConversation.client_id
      ? selectedConversation.provider?.business_name
      : selectedConversation.booking?.contact_name
    : ''

  return <main className="mx-auto max-w-6xl px-4 py-4 sm:py-10">
    <p className="text-sm font-semibold text-primary">Comunicación segura</p>
    <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Mensajes</h1>
    <p className="mt-1 text-sm text-muted-foreground sm:mt-2">Las conversaciones se habilitan después de confirmar el pago de la reserva.</p>
    {error && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

    <div className="mt-4 grid h-[calc(100dvh_-_16.5rem_-_env(safe-area-inset-bottom))] min-h-[360px] overflow-hidden rounded-2xl border bg-card sm:mt-8 md:h-auto md:min-h-[560px] md:grid-cols-[320px_1fr]">
      <aside className={`${selected && !showMobileList ? 'hidden' : 'flex'} min-h-0 flex-col border-b md:flex md:border-b-0 md:border-r`}>
        <div className="border-b p-4 font-semibold">Conversaciones pagadas</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {conversations.map((conversation) => {
            const counterpart = user?.id === conversation.client_id
              ? conversation.provider?.business_name
              : conversation.booking?.contact_name
            return <button
              key={conversation.id}
              onClick={() => { setSelected(conversation.id); setShowMobileList(false) }}
              className={`w-full border-b p-4 text-left transition-colors hover:bg-muted ${selected === conversation.id ? 'bg-muted' : ''}`}
            >
              <b className="text-sm">{counterpart || 'Participante'}</b>
              <p className="mt-1 text-xs text-muted-foreground">{conversation.booking?.event_name || 'Evento'} · {conversation.booking?.code}</p>
            </button>
          })}
          {conversations.length === 0 && <p className="p-6 text-sm text-muted-foreground">Cuando una reserva sea pagada, la conversación aparecerá aquí.</p>}
        </div>
      </aside>

      <section className={`${!selected || showMobileList ? 'hidden' : 'flex'} min-h-0 flex-col md:flex`}>
        {selected && <div className="flex items-center gap-3 border-b px-3 py-2 md:hidden">
          <Button type="button" size="icon" variant="ghost" aria-label="Ver conversaciones" onClick={() => setShowMobileList(true)}><ArrowLeft /></Button>
          <div className="min-w-0">
            <b className="block truncate text-sm">{selectedCounterpart || 'Conversación'}</b>
            <span className="block truncate text-xs text-muted-foreground">{selectedConversation?.booking?.event_name}</span>
          </div>
        </div>}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm sm:max-w-[80%] ${message.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString('es-CL')}</p>
            </div>
          </div>)}
        </div>

        {selected && <div className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t bg-card p-3 shadow-[0_-6px_20px_rgba(0,0,0,0.05)] sm:p-4">
          <Input
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }}
            placeholder="Escribe un mensaje..."
            aria-label="Mensaje"
          />
          <Button onClick={() => void send()} disabled={!text.trim() || sending} aria-label="Enviar mensaje"><Send /></Button>
        </div>}
      </section>

      {!selected && conversations.length > 0 && <div className="hidden items-center justify-center p-8 text-center text-muted-foreground md:flex"><div><MessagesSquare className="mx-auto size-8" /><p className="mt-3 text-sm">Selecciona una conversación.</p></div></div>}
    </div>
  </main>
}
