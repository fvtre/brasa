import type { Metadata } from 'next'
import { PROVIDERS } from '@/lib/providers'
import { getDbProviders } from '@/lib/provider-db'
import { ProviderExplorer } from '@/components/provider-explorer'

export const metadata: Metadata = { title:'Prestadores — Brasa', description:'Encuentra y compara prestadores para tu evento en Chile.' }

export default async function ProveedoresPage(){
 const db=await getDbProviders(); const byId=new Map([...PROVIDERS,...db].map(p=>[p.id,p])); const providers=[...byId.values()]
 return <div className="mx-auto max-w-6xl px-4 py-12"><header className="mb-8"><h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Prestadores</h1><p className="mt-2 max-w-xl text-pretty text-muted-foreground">Compara precios, evaluaciones y servicios. Los nuevos prestadores creados en Supabase aparecen junto a los perfiles demo.</p></header><ProviderExplorer providers={providers}/></div>
}
