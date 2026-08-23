'use client'
import * as React from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ProviderBookingActions({itemId,status}:{itemId:string;status:string}){const router=useRouter();const supabase=React.useMemo(()=>createClient(),[]);const [busy,setBusy]=React.useState('');async function update(next:string){setBusy(next);const {error}=await supabase.from('booking_items').update({provider_status:next}).eq('id',itemId);if(!error)router.refresh();setBusy('')}if(!['pendiente','esperando_confirmacion'].includes(status))return null;return <div className="mt-3 flex gap-2"><Button size="sm" onClick={()=>update('confirmada')} disabled={!!busy}>{busy==='confirmada'?<LoaderCircle className="animate-spin"/>:<Check/>}Aceptar</Button><Button size="sm" variant="outline" onClick={()=>update('cancelada')} disabled={!!busy}>{busy==='cancelada'?<LoaderCircle className="animate-spin"/>:<X/>}Rechazar</Button></div>}
