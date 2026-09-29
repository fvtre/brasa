import { NextResponse } from 'next/server'

import { deliverEventNotification } from '@/lib/event-notifications'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

  const { messageId } = (await request.json()) as { messageId?: string }
  if (!messageId) return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })

  const { data: message, error } = await supabase
    .from('messages')
    .select('id,sender_id,body,conversation:conversations!inner(id,client_id,booking:bookings(code,event_name,contact_name,contact_email),provider:service_providers!inner(owner_id,business_name))')
    .eq('id', messageId)
    .maybeSingle()

  const conversation = Array.isArray(message?.conversation) ? message.conversation[0] : message?.conversation
  const provider = Array.isArray(conversation?.provider) ? conversation.provider[0] : conversation?.provider
  const booking = Array.isArray(conversation?.booking) ? conversation.booking[0] : conversation?.booking
  if (error || !message || message.sender_id !== user.id || !conversation || !provider) {
    return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
  }

  const senderIsClient = user.id === conversation.client_id
  const senderIsProvider = user.id === provider.owner_id
  if (!senderIsClient && !senderIsProvider) {
    return NextResponse.json({ error: 'No participas en esta conversación' }, { status: 403 })
  }

  const recipientId = senderIsClient ? provider.owner_id : conversation.client_id
  const senderName = senderIsClient ? (booking?.contact_name || 'Tu cliente') : provider.business_name
  const result = await deliverEventNotification({
    recipientId,
    email: senderIsClient ? null : booking?.contact_email,
    type: 'message',
    title: `Nuevo mensaje de ${senderName}`,
    body: message.body.slice(0, 160),
    href: '/mensajes',
    eventKey: `message:${message.id}:${recipientId}`,
  })

  return NextResponse.json({ ok: true, ...result })
}
