import type { ReactNode } from 'react'

import { requireRole } from '@/lib/auth'

export default async function ProviderLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRole([
    'prestador',
    'administrador',
  ])

  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  )
}