import { NextResponse } from 'next/server'

import { deliverPendingEventNotifications } from '@/lib/event-notifications'
import { deliverBalanceReminders } from '@/lib/balance-reminders'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const balanceReminders = await deliverBalanceReminders()
  const { error: expirationError } = await admin.rpc('expire_stale_webpay_payments')
  if (expirationError) throw expirationError

  const { error: balanceExpirationError } = await admin.rpc('expire_overdue_booking_balances')
  if (balanceExpirationError && balanceExpirationError.code !== 'PGRST202') {
    throw balanceExpirationError
  }

  const result = await deliverPendingEventNotifications()
  return NextResponse.json({ ok: true, balanceReminders, ...result })
}
