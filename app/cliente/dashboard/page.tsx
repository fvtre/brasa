import Link from 'next/link'
import { CalendarDays, Heart, MessageCircle, PartyPopper, Plus, Wallet } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/format'

export default async function ClientDashboard(){
  const {profile}=await requireRole(['cliente','administrador'])
  const supabase=await createClient()
  const {data:bookings}=await supabase.from('bookings').select('id,code,event_name,event_date,event_time,status,total,comuna').eq('client_id',profile.id).order('created_at',{ascending:false}).limit(8)
  const upcoming=(bookings||[]).filter(b=>!['completada','cancelada'].includes(b.status)).length
  const spent=(bookings||[]).filter(b=>b.status!=='cancelada').reduce((s,b)=>s+(b.total||0),0)
  const {count:favorites}=await supabase.from('favorites').select('*',{count:'exact',head:true}).eq('client_id',profile.id)
  return <div className="mx-auto max-w-6xl px-4 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Cliente</p><h1 className="mt-1 text-3xl font-extrabold">Hola, {profile.full_name||'bienvenido'}</h1><p className="mt-2 text-muted-foreground">Organiza y sigue todos tus eventos desde aquí.</p></div><Button nativeButton={false} render={<Link href="/planificar"/>}><Plus/>Planificar evento</Button></div>
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><Kpi icon={CalendarDays} label="Eventos activos" value={String(upcoming)}/><Kpi icon={PartyPopper} label="Reservas" value={String(bookings?.length||0)}/><Kpi icon={Heart} label="Favoritos" value={String(favorites||0)}/><Kpi icon={Wallet} label="Total reservado" value={formatCLP(spent)}/></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"><Card><CardHeader><CardTitle>Mis reservas</CardTitle></CardHeader><CardContent className="space-y-3">{(bookings||[]).length===0?<div className="py-10 text-center text-sm text-muted-foreground">Todavía no tienes reservas. <Link className="text-primary" href="/proveedores">Explorar prestadores</Link></div>:(bookings||[]).map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><div className="flex items-center gap-2"><b>{b.event_name}</b><span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{b.status.replaceAll('_',' ')}</span></div><p className="mt-1 text-xs text-muted-foreground">{b.code} · {b.event_date} {b.event_time?.slice(0,5)} · {b.comuna||'Sin comuna'}</p></div><b>{formatCLP(b.total)}</b></div>)}</CardContent></Card><div className="space-y-4"><Card><CardContent className="p-5"><MessageCircle className="size-5 text-primary"/><h2 className="mt-3 font-bold">Mensajes</h2><p className="mt-1 text-sm text-muted-foreground">El chat cliente-prestador ya está modelado en Supabase y será la próxima capa visual.</p></CardContent></Card><Card><CardContent className="p-5"><PartyPopper className="size-5 text-primary"/><h2 className="mt-3 font-bold">Arma otro evento</h2><p className="mt-1 text-sm text-muted-foreground">Usa el planificador para distribuir presupuesto y comparar servicios.</p><Button nativeButton={false} variant="outline" className="mt-4 w-full" render={<Link href="/planificar"/>}>Comenzar</Button></CardContent></Card></div></div>
  </div>
}
function Kpi({icon:Icon,label,value}:{icon:any;label:string;value:string}){return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="size-4"/></div><p className="mt-2 text-2xl font-extrabold">{value}</p></CardContent></Card>}
