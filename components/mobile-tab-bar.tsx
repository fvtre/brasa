'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Grid2X2,
  Home,
  LayoutDashboard,
  ListChecks,
  Search,
  ShoppingBag,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { useEvent } from '@/components/event-provider'
import { cn } from '@/lib/utils'

type Tab = {
  href: string
  label: string
  icon: typeof Home
  badge?: number
}

export function MobileTabBar() {
  const pathname = usePathname()
  const { profile, user } = useAuth()
  const { selections } = useEvent()

  const tabs: Tab[] =
    profile?.role === 'prestador'
      ? [
          { href: '/prestador/dashboard#solicitudes', label: 'Solicitudes', icon: ListChecks },
          { href: '/prestador/servicios', label: 'Servicios', icon: Wrench },
          { href: '/prestador/disponibilidad', label: 'Agenda', icon: CalendarDays },
          { href: '/prestador/perfil', label: 'Perfil', icon: UserRound },
        ]
      : profile?.role === 'administrador'
        ? [
            { href: '/admin/dashboard', label: 'Panel', icon: LayoutDashboard },
            { href: '/categorias', label: 'Categorías', icon: Grid2X2 },
            { href: '/admin/prestadores', label: 'Prestadores', icon: Wrench },
            { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
          ]
        : [
            { href: '/', label: 'Inicio', icon: Home },
            { href: '/categorias', label: 'Categorías', icon: Grid2X2 },
            ...(user
              ? [
                  {
                    href: '/mi-evento',
                    label: 'Mi evento',
                    icon: ShoppingBag,
                    badge: selections.length,
                  },
                  { href: '/mis-reservas', label: 'Reservas', icon: CalendarDays },
                ]
              : [{ href: '/proveedores', label: 'Buscar', icon: Search }]),
            { href: user ? '/cuenta' : '/login', label: user ? 'Cuenta' : 'Entrar', icon: UserRound },
          ]

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-start justify-around">
        {tabs.map((tab) => {
          const tabPath = tab.href.split('#')[0]
          const active =
            tabPath === '/'
              ? pathname === '/'
              : pathname === tabPath || pathname.startsWith(`${tabPath}/`)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-w-14 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('relative rounded-lg p-1', active && 'bg-primary/10')}>
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {!!tab.badge && (
                  <span className="absolute -right-2 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
