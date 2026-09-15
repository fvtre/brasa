'use client'

import * as React from 'react'
import { MessageCircle, Send } from 'lucide-react'

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

  const loadConversations = React.useCallback(async () => {
    if (!user) return
    const { data, error: queryError } = await supabase.from('conversations').select('id,booking_id,client_id,provider_id,booking:bookings(code,event_name,event_date,contact_name),provider:service_providers(business_name)').order('created_at', { ascending: false })
    if (queryError) return setError(queryError.message)
    const rows = (data || []).map(row => ({
      ...row,
      booking: Array.isArray(row.booking) ? row.booking[0] || null : row.booking,
      provider: Array.isArray(row.provider) ? row.provider[0] || null : row.provider,
    })) as Conversation[]
    setConversations(rows)
    setSelected(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id || '')
  }, [supabase, user])

  const loadMessages = React.useCallback(async () => {
    if (!selected) return setMessages([])
    const { data, error: queryError } = await supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', selected).order('created_at')
    if (queryError) return setError(queryError.message)
    setMessages(data || [])
  }, [supabase, selected])

  React.useEffect(() => { loadConversations() }, [loadConversations])
  React.useEffect(() => {
    loadMessages()
    if (!selected) return
    const channel = supabase.channel(`conversation-${selected}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected}` }, loadMessages).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected, loadMessages, supabase])

  async function send() {
    if (!text.trim() || !selected || !user || sending) return
    setSending(true); setError('')
    const body = text.trim()
    const { data: created, error: insertError } = await supabase.from('messages').insert({ conversation_id: selected, sender_id: user.id, body }).select('id').single()
    if (insertError) setError(insertError.message)
    else {
      setText('')
      await loadMessages()
      void fetch('/api/push/message-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: created.id }),
      }).catch((pushError) => console.error('No se pudo avisar del mensaje:', pushError))
    }
    setSending(false)
  }

  if (!loading && !user) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><MessageCircle className="mx-auto size-8 text-primary" /><h1 className="mt-4 text-2xl font-bold">Inicia sesión para ver tus mensajes</h1></div>

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
    <p className="text-sm font-semibold text-primary">Comunicación segura</p><h1 className="mt-1 text-3xl font-extrabold">Mensajes</h1><p className="mt-2 text-sm text-muted-foreground">Las conversaciones se habilitan después de confirmar el pago de la reserva.</p>
    {error && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="mt-5 grid overflow-hidden rounded-2xl border bg-card sm:mt-8 md:min-h-[560px] md:grid-cols-[320px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r"><div className="border-b p-4 font-semibold">Conversaciones pagadas</div><div className="max-h-[500px] overflow-y-auto">{conversations.map(conversation => { const counterpart = user?.id === conversation.client_id ? conversation.provider?.business_name : conversation.booking?.contact_name; return <button key={conversation.id} onClick={() => setSelected(conversation.id)} className={`w-full border-b p-4 text-left transition-colors hover:bg-muted ${selected === conversation.id ? 'bg-muted' : ''}`}><b className="text-sm">{counterpart || 'Participante'}</b><p className="mt-1 text-xs text-muted-foreground">{conversation.booking?.event_name || 'Evento'} · {conversation.booking?.code}</p></button> })}{conversations.length === 0 && <p className="p-6 text-sm text-muted-foreground">Cuando una reserva sea pagada, la conversación aparecerá aquí.</p>}</div></aside>
      <section className="flex min-h-[520px] flex-col"><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map(message => <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${message.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString('es-CL')}</p></div></div>)}</div>{selected && <div className="flex gap-2 border-t p-4"><Input value={text} maxLength={2000} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder="Escribe un mensaje..." /><Button onClick={send} disabled={!text.trim() || sending} aria-label="Enviar mensaje"><Send /></Button></div>}</section>
    </div>
  </main>
}
