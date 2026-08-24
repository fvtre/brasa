import type { Metadata } from 'next'

import { PROVIDERS } from '@/lib/providers'
import { getDbProviders } from '@/lib/provider-db'
import { ProviderExplorer } from '@/components/provider-explorer'

export const metadata: Metadata = {
    title: 'Prestadores — Brasa',
    description:
        'Encuentra y compara prestadores para tu evento en Chile.',
}

type Props = {
    searchParams: Promise<{
        date?: string
        time?: string
        guests?: string
        category?: string
    }>
}

export default async function ProveedoresPage({
    searchParams,
}: Props) {
    const params =
        await searchParams

    const db =
        await getDbProviders()

    const byId =
        new Map(
            [
                ...PROVIDERS,
                ...db,
            ].map(
                provider => [
                    provider.id,
                    provider,
                ]
            )
        )

    const providers = [
        ...byId.values(),
    ]

    const alternativeSearch =
        Boolean(
            params.date &&
            params.time
        )

    return (
        <div className="mx-auto max-w-6xl px-4 py-12">

            <header className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                    {alternativeSearch
                        ? 'Encuentra otra alternativa'
                        : 'Prestadores'}
                </h1>

                <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
                    {alternativeSearch
                        ? 'Buscaremos prestadores disponibles para el horario de tu evento.'
                        : 'Compara precios, evaluaciones y servicios para encontrar la mejor opción para tu evento.'}
                </p>

                {alternativeSearch && (
                    <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                        <span>
                            📅 {params.date}
                        </span>

                        <span className="text-muted-foreground">
                            ·
                        </span>

                        <span>
                            🕐 {params.time}
                        </span>

                        {params.guests && (
                            <>
                                <span className="text-muted-foreground">
                                    ·
                                </span>

                                <span>
                                    👥 {params.guests} invitados
                                </span>
                            </>
                        )}
                    </div>
                )}
            </header>

            <ProviderExplorer
                providers={providers}
                eventContext={
                    alternativeSearch
                        ? {
                            date: params.date!,
                            time: params.time!,
                            guests: Number(
                                params.guests || 0
                            ),
                            category:
                                params.category,
                        }
                        : undefined
                }
            />

        </div>
    )
}