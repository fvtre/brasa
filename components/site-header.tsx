'use client'

import Link from 'next/link'

import {
  BriefcaseBusiness,
  Flame,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react'

import { ThemeToggle } from '@/components/theme-toggle'
import { useEvent } from '@/components/event-provider'
import { useAuth } from '@/components/auth/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NotificationsMenu } from '@/components/notifications-menu'

type NavItem = {
  href: string
  label: string
}

const PUBLIC_NAV: NavItem[] = [
  {
    href: '/categorias',
    label: 'Categorías',
  },
  {
    href: '/proveedores',
    label: 'Prestadores',
  },
  {
    href: '/comparar-precios',
    label: 'Comparar precios',
  },
]

const CLIENT_NAV: NavItem[] = [
  {
    href: '/categorias',
    label: 'Categorías',
  },
  {
    href: '/proveedores',
    label: 'Prestadores',
  },
  {
    href: '/planificar',
    label: 'Planificar evento',
  },
  {
    href: '/comparar-precios',
    label: 'Comparar precios',
  },
]

const PROVIDER_NAV: NavItem[] = [
  {
    href: '/prestador/dashboard',
    label: 'Dashboard',
  },
  {
    href: '/prestador/servicios',
    label: 'Servicios',
  },
  {
    href: '/prestador/disponibilidad',
    label: 'Disponibilidad',
  },
  {
    href: '/prestador/perfil',
    label: 'Perfil',
  },
]

const ADMIN_NAV: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
  },
  {
    href: '/categorias',
    label: 'Categorías',
  },
  {
    href: '/proveedores',
    label: 'Prestadores',
  },
  {
    href: '/comparar-precios',
    label: 'Comparar precios',
  },
]

export function SiteHeader() {
  const {
    selections,
  } = useEvent()

  const {
    user,
    profile,
    loading,
    signOut,
  } = useAuth()

  const role =
    profile?.role

  const dashboard =
    role === 'administrador'
      ? '/admin/dashboard'
      : role === 'prestador'
        ? '/prestador/dashboard'
        : '/cliente/dashboard'

  const navItems =
    !user
      ? PUBLIC_NAV
      : role === 'prestador'
        ? PROVIDER_NAV
        : role === 'administrador'
          ? ADMIN_NAV
          : CLIENT_NAV

  /*
   * Solo cliente/admin pueden organizar evento.
   *
   * Visitante NO ve Mi evento porque ahora
   * /mi-evento está protegido por servidor.
   */
  const showClientEvent =
    !!user &&
    (
      role === 'cliente' ||
      role === 'administrador'
    )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">

        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flame size={18} />
          </span>

          <span className="text-lg font-bold tracking-tight">
            Brasa
          </span>
        </Link>

        {/* NAVEGACIÓN */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(
            item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* ACCIONES */}
        <div className="flex items-center gap-2">

          {/* MI EVENTO SOLO CLIENTE / ADMIN */}
          {showClientEvent && (
            <Link
              href="/mi-evento"
              className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ShoppingBag size={16} />

              <span className="hidden sm:inline">
                Mi evento
              </span>

              {selections.length > 0 && (
                <Badge className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
                  {selections.length}
                </Badge>
              )}
            </Link>
          )}

          <ThemeToggle />

          {user && (
            <NotificationsMenu />
          )}

          {/* VISITANTE */}
          {!loading &&
            !user && (
              <Button
                nativeButton={false}
                size="sm"
                render={
                  <Link href="/login" />
                }
              >
                <LogIn />

                <span className="hidden sm:inline">
                  Entrar
                </span>
              </Button>
            )}

          {/* USUARIO LOGUEADO */}
          {!loading &&
            user && (
              <>
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={dashboard} />
                  }
                >
                  <DashboardIcon
                    role={role}
                  />

                  <span className="hidden lg:inline">
                    {role === 'prestador'
                      ? 'Mi negocio'
                      : role === 'administrador'
                        ? 'Admin'
                        : 'Mi cuenta'}
                  </span>
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Cerrar sesión"
                  onClick={signOut}
                >
                  <LogOut />
                </Button>
              </>
            )}
        </div>
      </div>
    </header>
  )
}

function DashboardIcon({
  role,
}: {
  role?: string
}) {
  if (
    role === 'administrador'
  ) {
    return <ShieldCheck />
  }

  if (
    role === 'prestador'
  ) {
    return <BriefcaseBusiness />
  }

  if (
    role === 'cliente'
  ) {
    return <UserRound />
  }

  return <LayoutDashboard />
}