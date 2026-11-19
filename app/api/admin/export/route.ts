import { Zip, ZipDeflate } from 'fflate'
import { NextResponse } from 'next/server'

import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const pageSize = 500
const exportTables = [
  { name: 'profiles', orderBy: ['id'] },
  { name: 'service_categories', orderBy: ['id'] },
  { name: 'service_providers', orderBy: ['id'] },
  { name: 'provider_category_gallery', orderBy: ['id'] },
  { name: 'provider_services', orderBy: ['id'] },
  { name: 'provider_availability', orderBy: ['id'] },
  { name: 'bookings', orderBy: ['id'] },
  { name: 'booking_items', orderBy: ['id'] },
  { name: 'booking_terms_acceptances', orderBy: ['id'] },
  { name: 'booking_cancellations', orderBy: ['id'] },
  { name: 'booking_cancellation_refunds', orderBy: ['id'] },
  { name: 'payments', orderBy: ['id'], excludedColumns: ['token'] },
  { name: 'provider_payout_accounts', orderBy: ['id'] },
  { name: 'provider_payouts', orderBy: ['id'] },
  { name: 'reviews', orderBy: ['id'] },
  { name: 'favorites', orderBy: ['client_id', 'provider_id'] },
  { name: 'conversations', orderBy: ['id'] },
  { name: 'messages', orderBy: ['id'] },
  { name: 'notifications', orderBy: ['id'] },
  { name: 'ai_plans', orderBy: ['id'] },
  { name: 'catalog_providers', orderBy: ['id'] },
  { name: 'products', orderBy: ['id'] },
  { name: 'product_prices', orderBy: ['id'] },
  { name: 'security_audit_events', orderBy: ['id'] },
] as const

export async function GET() {
  const session = await getCurrentProfile()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  if (!session.profile.active || session.profile.role !== 'administrador') {
    return NextResponse.json({ error: 'Se requiere una cuenta administradora activa.' }, { status: 403 })
  }

  const userClient = await createClient()
  const { data: assurance, error: assuranceError } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assuranceError || assurance.currentLevel !== 'aal2') {
    return NextResponse.json({ error: 'Completa la verificación en dos pasos para exportar los datos.' }, { status: 403 })
  }

  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch (error) {
    console.error('No se pudo inicializar la exportación administrativa:', error)
    return NextResponse.json({ error: 'La exportación no está configurada en el servidor.' }, { status: 500 })
  }

  try {
    const chunks = await createExportArchive(adminClient)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="brasa-datos-${new Date().toISOString().slice(0, 10)}.zip"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Falló la exportación completa de datos:', error)
    const message = error instanceof ExportTableError
      ? `No se pudo exportar la tabla ${error.tableName}. No se generó ningún archivo.`
      : 'No se pudo completar la exportación. No se generó ningún archivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const encoder = new TextEncoder()
const formulaPrefix = /^[\s]*[=+\-@]/

async function createExportArchive(adminClient: ReturnType<typeof createAdminClient>) {
  return new Promise<Uint8Array[]>((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let settled = false
    const archive = new Zip((error, chunk, final) => {
      if (error) {
        if (!settled) {
          settled = true
          reject(error)
        }
        return
      }
      if (chunk.length) chunks.push(chunk)
      if (final && !settled) {
        settled = true
        resolve(chunks)
      }
    })

    void (async () => {
      const manifest = [
        'Exportación de datos de Brasa',
        `Generada: ${new Date().toISOString()}`,
        '',
        'Se incluye un CSV por tabla de negocio de public, con todos sus registros paginados.',
        'Se excluyen auth.* y las tablas push_subscriptions, push_delivery_events y push_event_deliveries.',
        'Se excluye provider_categories porque no está creada en el script SQL del proyecto.',
        'Se omiten payments.token y las claves metadata.session_id y metadata.webpay_url.',
        'provider_payout_accounts incluye datos bancarios y RUT completos.',
        '',
        'Tablas incluidas:',
        ...exportTables.map(table => table.name),
      ].join('\r\n')
      addZipFile(archive, 'LEEME.txt', new TextEncoder().encode(manifest))

      for (const table of exportTables) {
        const file = new ZipDeflate(`${table.name}.csv`, { level: 6 })
        archive.add(file)
        let offset = 0
        let header: string[] | null = null

        while (true) {
          let query = adminClient.from(table.name).select('*')
          for (const column of table.orderBy) {
            query = query.order(column, { ascending: true })
          }
          const { data, error } = await query.range(offset, offset + pageSize - 1)
          if (error) throw new ExportTableError(table.name, error.message)

          const rows = (data || []).map(row => {
            const record = { ...(row as Record<string, unknown>) }
            if ('excludedColumns' in table) {
              for (const column of table.excludedColumns) delete record[column]
            }
            if (table.name === 'payments' && record.metadata && typeof record.metadata === 'object') {
              const metadata = { ...(record.metadata as Record<string, unknown>) }
              delete metadata.session_id
              delete metadata.webpay_url
              record.metadata = metadata
            }
            return record
          })

          if (rows.length) {
            if (!header) {
              header = Object.keys(rows[0])
              file.push(encodeCsvRow(header, true), false)
            }
            for (const row of rows) {
              file.push(encodeCsvRow(header.map(column => row[column])), false)
            }
          }

          if (rows.length < pageSize) break
          offset += pageSize
        }

        file.push(new Uint8Array(0), true)
      }
      archive.end()
    })().catch(error => {
      archive.terminate()
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}

function encodeCsvRow(values: unknown[], includeBom = false) {
  const line = values.map(value => {
    let text: string
    if (value === null || value === undefined) {
      text = ''
    } else if (typeof value === 'object') {
      text = JSON.stringify(value)
    } else {
      text = String(value)
    }

    if (formulaPrefix.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }).join(';')

  return encoder.encode(`${includeBom ? '\uFEFF' : ''}${line}\r\n`)
}

function addZipFile(archive: Zip, name: string, content: Uint8Array) {
  const file = new ZipDeflate(name, { level: 6 })
  archive.add(file)
  file.push(content, true)
}

class ExportTableError extends Error {
  constructor(readonly tableName: string, message: string) {
    super(message)
    this.name = 'ExportTableError'
  }
}
