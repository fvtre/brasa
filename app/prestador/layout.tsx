import type { ReactNode } from 'react'
import Link from 'next/link'

import {
  CalendarDays,
  LayoutDashboard,
  UserRound,
  Package,
  Store,
} from 'lucide-react'

import { requireRole } from '@/lib/auth'

export default async function ProviderLayout({
  children,
}: {
  children: ReactNode
}) {
  const { profile } = await requireRole([
    'prestador',
    'administrador',
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior del panel prestador */}
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">

          {/* Identidad */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Panel Prestador
            </p>

            <p className="mt-1 font-bold">
              {profile.full_name || 'Prestador Brasa'}
            </p>
          </div>

          {/* Navegación */}
          <nav className="flex flex-wrap gap-2">

            <Link
              href="/prestador/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>

            <Link
              href="/prestador/perfil"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <UserRound className="size-4" />
              Mi perfil
            </Link>

            <Link
              href="/prestador/servicios"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <Package className="size-4" />
              Servicios
            </Link>

            <Link
              href="/prestador/disponibilidad"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <CalendarDays className="size-4" />
              Disponibilidad
            </Link>

            <Link
              href="/proveedores"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <Store className="size-4" />
              Ver marketplace
            </Link>

          </nav>
        </div>
      </div>

      {/* Página actual */}
      <main>
        {children}
      </main>
    </div>
  )
}