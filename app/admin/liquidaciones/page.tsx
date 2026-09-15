import { AdminPayoutManager, type PayoutAccount, type PayoutRow } from '@/components/admin-payout-manager'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPayoutsPage() {
  const supabase = await createClient()
  const [{ data: accountData, error: accountError }, { data: payoutData, error: payoutError }] = await Promise.all([
    supabase.from('provider_payout_accounts').select('id,provider_id,holder_name,holder_rut,bank_name,account_type,account_number,notification_email,verified,provider:service_providers(business_name)').order('created_at', { ascending: false }),
    supabase.from('provider_payouts').select('id,provider_id,net_amount,status,available_at,paid_at,transfer_reference,provider:service_providers(business_name),booking:bookings(code,event_name)').order('created_at', { ascending: false }),
  ])
  if (accountError) throw new Error(accountError.message)
  if (payoutError) throw new Error(payoutError.message)

  const accounts = (accountData || []).map(row => ({ ...row, provider_name: (Array.isArray(row.provider) ? row.provider[0] : row.provider)?.business_name || 'Prestador' })) as unknown as PayoutAccount[]
  const payouts = (payoutData || []).map(row => { const provider = Array.isArray(row.provider) ? row.provider[0] : row.provider; const booking = Array.isArray(row.booking) ? row.booking[0] : row.booking; return { ...row, provider_name: provider?.business_name || 'Prestador', booking_code: booking?.code || '', event_name: booking?.event_name || 'Evento' } }) as unknown as PayoutRow[]

  return <main className="mx-auto max-w-7xl px-4 py-10"><p className="text-sm font-semibold text-primary">Administración</p><h1 className="mt-1 text-3xl font-extrabold">Liquidaciones</h1><p className="mt-2 text-muted-foreground">Verifica cuentas y registra transferencias realizadas fuera de Brasa.</p><AdminPayoutManager initialAccounts={accounts} payouts={payouts} /></main>
}
