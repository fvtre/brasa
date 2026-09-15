import { redirect } from 'next/navigation'

import { ProviderPayoutAccountForm } from '@/components/provider-payout-account-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireRole } from '@/lib/auth'
import { formatCLP } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProviderPaymentsPage() {
  const { profile } = await requireRole(['prestador'])
  const supabase = await createClient()
  const { data: provider } = await supabase.from('service_providers').select('id,business_name').eq('owner_id', profile.id).maybeSingle()
  if (!provider) redirect('/prestador/onboarding')

  const [{ data: account, error: accountError }, { data: payouts, error: payoutError }] = await Promise.all([
    supabase.from('provider_payout_accounts').select('provider_id,holder_name,holder_rut,bank_code,bank_name,account_type,account_number,notification_email,verified').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_payouts').select('id,status,net_amount,available_at,paid_at,booking:bookings(code,event_name,event_date)').eq('provider_id', provider.id).order('created_at', { ascending: false }),
  ])
  if (accountError) throw new Error(accountError.message)
  if (payoutError) throw new Error(payoutError.message)

  const rows = payouts || []
  const pending = rows.filter(row => ['retenida', 'lista_para_pagar'].includes(row.status)).reduce((sum, row) => sum + row.net_amount, 0)
  const paid = rows.filter(row => row.status === 'pagada').reduce((sum, row) => sum + row.net_amount, 0)

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-sm font-semibold text-primary">Prestador</p><h1 className="mt-1 text-3xl font-extrabold">Pagos y cuenta bancaria</h1><p className="mt-2 text-muted-foreground">Registra la cuenta donde Brasa transferirá tus servicios completados.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Saldo próximo a liquidar</p><b className="mt-1 block text-2xl">{formatCLP(pending)}</b></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total transferido</p><b className="mt-1 block text-2xl text-emerald-700">{formatCLP(paid)}</b></CardContent></Card></div>
    <Card className="mt-6"><CardHeader><CardTitle>Cuenta para transferencias</CardTitle></CardHeader><CardContent><ProviderPayoutAccountForm providerId={provider.id} initialAccount={account} defaultName={profile.full_name || provider.business_name} defaultEmail={profile.email || ''} /></CardContent></Card>
    <Card className="mt-6"><CardHeader><CardTitle>Liquidaciones</CardTitle></CardHeader><CardContent className="space-y-3">{rows.map(row => { const booking = Array.isArray(row.booking) ? row.booking[0] : row.booking; return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><b>{booking?.event_name || 'Evento'}</b><p className="text-xs text-muted-foreground">{booking?.code} · {booking?.event_date} · Disponible {new Date(row.available_at).toLocaleString('es-CL')}</p></div><div className="text-right"><b>{formatCLP(row.net_amount)}</b><p className="text-xs capitalize text-muted-foreground">{row.status.replaceAll('_', ' ')}</p></div></div>})}{rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aún no tienes liquidaciones.</p>}</CardContent></Card>
  </main>
}
