import Link from 'next/link'
import { BriefcaseBusiness, CalendarDays, DollarSign, ShieldCheck, Users } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/format'

export default async function AdminDashboard(){
 await requireRole(['administrador']); const supabase=await createClient()
 const [{count:users},{count:providers},{count:bookings},{data:payments},{data:recent}]=await Promise.all([
  supabase.from('profiles').select('*',{count:'exact',head:true}),
  supabase.from('service_providers').select('*',{count:'exact',head:true}),
  supabase.from('bookings').select('*',{count:'exact',head:true}),
  supabase.from('payments').select('amount,status'),
  supabase.from('bookings').select('id,code,event_name,event_date,status,total,client:profiles!bookings_client_id_fkey(full_name)').order('created_at',{ascending:false}).limit(8),
 ])
 const paid=(payments||[]).filter((p:any)=>['pagado','autorizado'].includes(p.status)).reduce((s:number,p:any)=>s+(p.amount||0),0)
 return <div className="mx-auto max-w-7xl px-4 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Administración</p><h1 className="mt-1 text-3xl font-extrabold">Panel general Brasa</h1><p className="mt-2 text-muted-foreground">Operación, usuarios, prestadores y reservas.</p></div><div className="flex gap-2"><Button nativeButton={false} variant="outline" render={<Link href="/admin/usuarios"/>}><Users/>Usuarios</Button><Button nativeButton={false} render={<Link href="/admin/prestadores"/>}><BriefcaseBusiness/>Prestadores</Button></div></div><div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><Kpi icon={Users} label="Usuarios" value={String(users||0)}/><Kpi icon={BriefcaseBusiness} label="Prestadores" value={String(providers||0)}/><Kpi icon={CalendarDays} label="Reservas" value={String(bookings||0)}/><Kpi icon={DollarSign} label="Pagos registrados" value={formatCLP(paid)}/></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]"><Card><CardHeader><CardTitle>Reservas recientes</CardTitle></CardHeader><CardContent className="space-y-3">{(recent||[]).map((b:any)=><div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><div className="flex items-center gap-2"><b>{b.event_name}</b><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">{b.status.replaceAll('_',' ')}</span></div><p className="mt-1 text-xs text-muted-foreground">{b.code} · {b.event_date} · {b.client?.full_name||'Cliente'}</p></div><b>{formatCLP(b.total)}</b></div>)}{(recent||[]).length===0&&<p className="py-10 text-center text-sm text-muted-foreground">Sin reservas todavía.</p>}</CardContent></Card><div className="space-y-4"><Card><CardContent className="p-5"><ShieldCheck className="size-5 text-primary"/><h2 className="mt-3 font-bold">Verificación de prestadores</h2><p className="mt-1 text-sm text-muted-foreground">El administrador puede activar, destacar y verificar perfiles profesionales.</p><Button nativeButton={false} variant="outline" className="mt-4 w-full" render={<Link href="/admin/prestadores"/>}>Gestionar</Button></CardContent></Card><Card><CardContent className="p-5"><Users className="size-5 text-primary"/><h2 className="mt-3 font-bold">Roles</h2><p className="mt-1 text-sm text-muted-foreground">Cliente, Prestador y Administrador están separados mediante RLS en Supabase.</p></CardContent></Card></div></div></div>
}
function Kpi({icon:Icon,label,value}:{icon:any;label:string;value:string}){return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="size-4"/></div><p className="mt-2 text-2xl font-extrabold">{value}</p></CardContent></Card>}
