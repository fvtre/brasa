'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Landmark } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/format'

export type PayoutAccount = { id: string; provider_id: string; holder_name: string; holder_rut: string; bank_name: string; account_type: string; account_number: string; notification_email: string; verified: boolean; provider_name: string }
export type PayoutRow = { id: string; provider_id: string; net_amount: number; status: string; available_at: string; paid_at: string | null; transfer_reference: string | null; provider_name: string; booking_code: string; event_name: string }

export function AdminPayoutManager({ initialAccounts, payouts }: { initialAccounts: PayoutAccount[]; payouts: PayoutRow[] }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  async function verify(account: PayoutAccount) {
    if (!window.confirm(`¿Confirmas que verificaste los datos bancarios de ${account.provider_name}?`)) return
    setWorking(account.id); setError('')
    const response = await fetch(`/api/admin/payout-accounts/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verified: !account.verified }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'No se pudo verificar la cuenta.')
    else { setAccounts(current => current.map(row => row.id === account.id ? { ...row, verified: !row.verified } : row)); router.refresh() }
    setWorking('')
  }

  async function registerPaid(payout: PayoutRow) {
    const reference = window.prompt(`Ingresa el número de operación o referencia de la transferencia a ${payout.provider_name}:`)
    if (!reference?.trim()) return
    if (!window.confirm(`¿Registrar ${formatCLP(payout.net_amount)} como transferidos?`)) return
    setWorking(payout.id); setError('')
    const response = await fetch(`/api/admin/payouts/${payout.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_paid', reference: reference.trim() }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'No se pudo registrar la transferencia.')
    else router.refresh()
    setWorking('')
  }

  return <div className="mt-8 space-y-8">
    {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <section><h2 className="text-xl font-bold">Cuentas bancarias</h2><div className="mt-3 grid gap-3">{accounts.map(account => <article key={account.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"><div><b>{account.provider_name}</b><p className="mt-1 text-sm text-muted-foreground">{account.holder_name} · {account.holder_rut} · {account.bank_name} · {account.account_type.replaceAll('_', ' ')} · ••••{account.account_number.slice(-4)}</p></div><Button variant={account.verified ? 'outline' : 'default'} disabled={working === account.id} onClick={() => verify(account)}><BadgeCheck />{account.verified ? 'Quitar verificación' : 'Verificar cuenta'}</Button></article>)}{accounts.length === 0 && <p className="rounded-xl border p-6 text-sm text-muted-foreground">No hay cuentas bancarias registradas.</p>}</div></section>
    <section><h2 className="text-xl font-bold">Liquidaciones por servicio</h2><div className="mt-3 grid gap-3">{payouts.map(payout => { const account = accounts.find(row => row.provider_id === payout.provider_id); const canPay = payout.status === 'lista_para_pagar' && account?.verified; return <article key={payout.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"><div><div className="flex flex-wrap items-center gap-2"><b>{payout.provider_name}</b><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{payout.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-sm text-muted-foreground">{payout.event_name} · {payout.booking_code} · Disponible {new Date(payout.available_at).toLocaleString('es-CL')}</p>{payout.transfer_reference && <p className="mt-1 text-xs text-muted-foreground">Referencia: {payout.transfer_reference}</p>}</div><div className="text-right"><b className="text-lg">{formatCLP(payout.net_amount)}</b>{payout.status !== 'pagada' && <Button className="ml-3" disabled={!canPay || working === payout.id} onClick={() => registerPaid(payout)}><Landmark />Registrar transferencia</Button>} {!account?.verified && payout.status !== 'pagada' && <p className="mt-1 text-xs text-amber-700">Falta verificar cuenta bancaria</p>}</div></article>})}{payouts.length === 0 && <p className="rounded-xl border p-6 text-sm text-muted-foreground">No hay liquidaciones generadas.</p>}</div></section>
  </div>
}
