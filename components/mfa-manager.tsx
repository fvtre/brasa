'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

type Factor = { id: string; friendly_name?: string; status: string }

export function MfaManager({ required = false }: { required?: boolean }) {
  const supabase = createClient()
  const [factors, setFactors] = useState<Factor[]>([])
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const [{ data, error }, assurance] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (error) setMessage(error.message)
    setFactors((data?.totp || []) as Factor[])
    setCurrentLevel(assurance.data?.currentLevel || null)
    const verifiedFactor = (data?.totp || []).find(factor => factor.status === 'verified')
    if (verifiedFactor) setFactorId(verifiedFactor.id)
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  async function enroll() {
    setMessage('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Brasa Authenticator' })
    if (error) return setMessage(error.message)
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function verify() {
    setMessage('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (error) return setMessage(error.message)
    setMessage('Verificación en dos pasos activada correctamente.')
    setQrCode('')
    setCode('')
    await refresh()
    window.location.assign('/cuenta')
  }

  const verified = factors.some(factor => factor.status === 'verified')
  const sessionVerified = verified && currentLevel === 'aal2'
  return <Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Verificación en dos pasos</CardTitle></CardHeader><CardContent className="space-y-5">
    {required && !sessionVerified && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Por seguridad, administradores y prestadores deben completar el segundo factor antes de acceder a sus funciones.</div>}
    {loading ? <Loader2 className="size-5 animate-spin" /> : sessionVerified ? <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="size-5" /> Sesión verificada con MFA</div> : verified ? <div className="space-y-3"><p className="text-sm text-muted-foreground">Ingresa el código actual de tu aplicación autenticadora para completar el acceso.</p><input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} onKeyDown={event => { if (event.key === 'Enter' && code.length === 6) void verify() }} className="h-11 w-full rounded-lg border bg-background px-3 text-center text-lg tracking-[0.4em]" placeholder="000000" /><Button onClick={verify} disabled={code.length !== 6}>Verificar acceso</Button></div> : !qrCode ? <Button onClick={enroll}><KeyRound /> Configurar aplicación autenticadora</Button> : <div className="grid gap-5 md:grid-cols-[220px_1fr]"><div className="rounded-xl border bg-white p-3"><img src={qrCode} alt="Código QR para configurar MFA" className="h-auto w-full" /></div><div className="space-y-3"><p className="text-sm text-muted-foreground">Escanea el QR con una aplicación autenticadora TOTP y luego ingresa el código de 6 dígitos.</p><p className="break-all rounded-lg bg-muted p-3 font-mono text-xs">Clave manual: {secret}</p><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="h-11 w-full rounded-lg border bg-background px-3" placeholder="000000" /><Button onClick={verify} disabled={code.length !== 6}>Verificar y activar</Button></div></div>}
    {message && <p className="text-sm" role="status">{message}</p>}
  </CardContent></Card>
}
