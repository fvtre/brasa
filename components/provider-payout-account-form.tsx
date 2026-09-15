'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Save } from 'lucide-react'

import { CHILE_BANKS } from '@/lib/chile-banks'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Account = {
  provider_id: string
  holder_name: string
  holder_rut: string
  bank_code: string
  bank_name: string
  account_type: 'corriente' | 'vista' | 'ahorro' | 'cuenta_rut'
  account_number: string
  notification_email: string
  verified: boolean
}

export function ProviderPayoutAccountForm({ providerId, initialAccount, defaultName, defaultEmail }: {
  providerId: string
  initialAccount: Account | null
  defaultName: string
  defaultEmail: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [form, setForm] = useState<Account>(initialAccount || {
    provider_id: providerId,
    holder_name: defaultName,
    holder_rut: '',
    bank_code: '012',
    bank_name: 'BancoEstado',
    account_type: 'cuenta_rut',
    account_number: '',
    notification_email: defaultEmail,
    verified: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  function patch(values: Partial<Account>) { setForm(current => ({ ...current, ...values })) }

  async function save() {
    setSaving(true); setMessage(''); setIsError(false)
    try {
      if (!form.holder_name.trim() || !form.holder_rut.trim() || !form.account_number.trim() || !form.notification_email.trim()) throw new Error('Completa todos los datos bancarios.')
      const bank = CHILE_BANKS.find(([code]) => code === form.bank_code)
      if (!bank) throw new Error('Selecciona un banco válido.')
      const { data, error } = await supabase.from('provider_payout_accounts').upsert({
        provider_id: providerId,
        holder_name: form.holder_name.trim(),
        holder_rut: form.holder_rut.trim(),
        bank_code: bank[0],
        bank_name: bank[1],
        account_type: form.account_type,
        account_number: form.account_number.replace(/\s/g, ''),
        notification_email: form.notification_email.trim(),
      }, { onConflict: 'provider_id' }).select('provider_id,holder_name,holder_rut,bank_code,bank_name,account_type,account_number,notification_email,verified').single()
      if (error) throw error
      setForm(data as Account)
      setMessage('Datos guardados. Brasa debe verificar la cuenta antes de transferir.')
    } catch (cause) {
      setIsError(true)
      setMessage(cause instanceof Error ? cause.message : 'No se pudieron guardar los datos.')
    } finally { setSaving(false) }
  }

  return <div className="grid gap-4 md:grid-cols-2">
    {message && <p className={`rounded-xl border p-3 text-sm md:col-span-2 ${isError ? 'border-destructive/30 text-destructive' : 'border-emerald-500/30 text-emerald-700'}`}>{message}</p>}
    <label className="grid gap-1.5 text-sm font-medium">Titular de la cuenta<Input value={form.holder_name} onChange={event => patch({ holder_name: event.target.value })} /></label>
    <label className="grid gap-1.5 text-sm font-medium">RUT del titular<Input value={form.holder_rut} onChange={event => patch({ holder_rut: event.target.value })} placeholder="12.345.678-9" /></label>
    <label className="grid gap-1.5 text-sm font-medium">Banco<select className="h-9 rounded-lg border bg-background px-3 text-sm" value={form.bank_code} onChange={event => patch({ bank_code: event.target.value })}>{CHILE_BANKS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-medium">Tipo de cuenta<select className="h-9 rounded-lg border bg-background px-3 text-sm" value={form.account_type} onChange={event => patch({ account_type: event.target.value as Account['account_type'] })}><option value="corriente">Cuenta corriente</option><option value="vista">Cuenta vista</option><option value="ahorro">Cuenta de ahorro</option><option value="cuenta_rut">CuentaRUT</option></select></label>
    <label className="grid gap-1.5 text-sm font-medium">Número de cuenta<Input inputMode="numeric" value={form.account_number} onChange={event => patch({ account_number: event.target.value.replace(/[^0-9]/g, '') })} /></label>
    <label className="grid gap-1.5 text-sm font-medium">Correo para comprobantes<Input type="email" value={form.notification_email} onChange={event => patch({ notification_email: event.target.value })} /></label>
    <div className="flex flex-wrap items-center gap-3 md:col-span-2"><Button onClick={save} disabled={saving}><Save />{saving ? 'Guardando...' : 'Guardar cuenta bancaria'}</Button>{form.verified && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Cuenta verificada</span>}</div>
  </div>
}
