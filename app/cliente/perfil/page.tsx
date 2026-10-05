import { UserRound } from 'lucide-react'

import { ClientProfileForm } from '@/components/client-profile-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ClientProfilePage() {
  const { profile } = await requireRole(['cliente'])

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserRound className="size-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">Mi cuenta</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Perfil de cliente</h1>
        </div>
      </div>

      <Card className="mt-7 rounded-2xl">
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mantén estos datos actualizados para coordinar correctamente tus eventos.
          </p>
        </CardHeader>
        <CardContent>
          <ClientProfileForm profile={profile} />
        </CardContent>
      </Card>
    </main>
  )
}
