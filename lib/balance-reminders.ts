import 'server-only'

import { deliverEventNotification } from '@/lib/event-notifications'
import { formatCLP } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deliverBalanceReminders(now = new Date()) {
  const admin = createAdminClient()
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('id,code,client_id,event_name,total,balance_due_at,contact_email,payments(amount,status)')
    .eq('payment_plan', 'deposit_balance')
    .eq('status', 'confirmada')
    .not('balance_due_at', 'is', null)
    .lte('balance_due_at', new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString())
  if (error) throw error

  let reminders = 0
  for (const booking of bookings || []) {
    const paidAmount = (booking.payments || [])
      .filter(payment => ['pagado', 'autorizado'].includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const balance = Math.max(0, Number(booking.total) - paidAmount)
    if (paidAmount <= 0 || balance <= 0 || !booking.balance_due_at) continue

    const millisecondsLeft = new Date(booking.balance_due_at).getTime() - now.getTime()
    const reminderKey = millisecondsLeft <= 0 ? 'vencido' : millisecondsLeft <= 24 * 60 * 60 * 1000 ? '24h' : '48h'
    const title = reminderKey === 'vencido' ? 'Saldo de reserva vencido' : 'Recuerda pagar el saldo de tu reserva'
    const body = reminderKey === 'vencido'
      ? `${booking.event_name}: venció el saldo de ${formatCLP(balance)}. La agenda será liberada según las condiciones aceptadas.`
      : `${booking.event_name}: debes pagar ${formatCLP(balance)} antes del ${new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(booking.balance_due_at))}.`

    await deliverEventNotification({
      recipientId: booking.client_id,
      email: booking.contact_email,
      type: 'balance_reminder',
      title,
      body,
      href: `/mis-reservas/${encodeURIComponent(booking.code)}`,
      eventKey: `balance-reminder:${booking.id}:${reminderKey}`,
    })
    reminders += 1
  }
  return reminders
}
