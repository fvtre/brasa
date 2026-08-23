'use client'

import Link from 'next/link'
import { BriefcaseBusiness, Flame, LayoutDashboard, LogIn, LogOut, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEvent } from '@/components/event-provider'
import { useAuth } from '@/components/auth/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NotificationsMenu } from '@/components/notifications-menu'

const NAV=[{href:'/categorias',label:'Categorías'},{href:'/proveedores',label:'Prestadores'},{href:'/planificar',label:'Planificar evento'},{href:'/comparar-precios',label:'Comparar precios'}]

export function SiteHeader(){const {selections}=useEvent();const {user,profile,loading,signOut}=useAuth();const dashboard=profile?.role==='administrador'?'/admin/dashboard':profile?.role==='prestador'?'/prestador/dashboard':'/cliente/dashboard';return <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4"><Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Flame size={18}/></span><span className="text-lg font-bold tracking-tight">Brasa</span></Link><nav className="hidden items-center gap-1 md:flex">{NAV.map(i=><Link key={i.href} href={i.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{i.label}</Link>)}</nav><div className="flex items-center gap-2"><Link href="/mi-evento" className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"><ShoppingBag size={16}/><span className="hidden sm:inline">Mi evento</span>{selections.length>0&&<Badge className="ml-0.5 h-5 min-w-5 justify-center px-1.5">{selections.length}</Badge>}</Link><ThemeToggle/>{user&&<NotificationsMenu/>}{!loading&&!user&&<Button nativeButton={false} size="sm" render={<Link href="/login"/>}><LogIn/><span className="hidden sm:inline">Entrar</span></Button>}{!loading&&user&&<><Button nativeButton={false} size="sm" variant="outline" render={<Link href={dashboard}/>}><DashboardIcon role={profile?.role}/><span className="hidden lg:inline">{profile?.role==='prestador'?'Mi negocio':profile?.role==='administrador'?'Admin':'Mi cuenta'}</span></Button><Button size="icon" variant="ghost" aria-label="Cerrar sesión" onClick={signOut}><LogOut/></Button></>}</div></div></header>}
function DashboardIcon({role}:{role?:string}){if(role==='administrador')return <ShieldCheck/>;if(role==='prestador')return <BriefcaseBusiness/>;if(role==='cliente')return <UserRound/>;return <LayoutDashboard/>}
