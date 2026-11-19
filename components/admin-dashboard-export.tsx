'use client'

import { Database, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ExportBooking = {
  code: string
  createdAt: string
  eventDate: string
  eventName: string
  status: string
  total: number
  clientName: string
}

type ExportCategory = { name: string; bookings: number; amount: number }
type ExportClient = { name: string; bookings: number }
type ExportMetric = { label: string; value: string }

export function AdminDashboardExport({
  bookings,
  categories,
  clients,
  monthlyBookings,
  metrics,
  preview = false,
}: {
  bookings: ExportBooking[]
  categories: ExportCategory[]
  clients: ExportClient[]
  monthlyBookings: { label: string; count: number }[]
  metrics: ExportMetric[]
  preview?: boolean
}) {
  function downloadCsv() {
    const rows: unknown[][] = [
      ['Sección', 'Fecha de solicitud', 'Fecha del evento', 'Código', 'Evento o indicador', 'Estado', 'Cliente', 'Categoría', 'Cantidad', 'Monto solicitado CLP'],
      ...metrics.map(metric => [
        'KPI',
        '',
        '',
        '',
        metric.label,
        '',
        '',
        '',
        metric.value,
        '',
      ]),
      ...monthlyBookings.map(month => [
        'Reservas por mes',
        '',
        '',
        '',
        month.label,
        '',
        '',
        '',
        month.count,
        '',
      ]),
      ...bookings.map(booking => [
        'Reserva',
        booking.createdAt.slice(0, 10),
        booking.eventDate,
        booking.code,
        booking.eventName,
        booking.status.replaceAll('_', ' '),
        booking.clientName,
        '',
        '',
        booking.total,
      ]),
      ...categories.map(category => [
        'Categoría últimos 30 días',
        '',
        '',
        '',
        '',
        '',
        '',
        category.name,
        category.bookings,
        category.amount,
      ]),
      ...clients.map(client => [
        'Cliente recurrente',
        '',
        '',
        '',
        '',
        '',
        client.name,
        '',
        client.bookings,
        '',
      ]),
    ]

    const csv = rows.map(row => row.map(escapeCsvValue).join(';')).join('\r\n')
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `brasa-dashboard${preview ? '-vista-previa' : ''}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadCsv}>
          <Download /> {preview ? 'Exportar CSV de prueba' : 'Exportar resumen CSV'}
        </Button>
        {preview ? (
          <Button disabled>
            <Database /> Base completa (solo admin)
          </Button>
        ) : (
          <Button nativeButton={false} render={<a href="/api/admin/export" />}>
            <Database /> Descargar base completa
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {preview
          ? 'El CSV contiene datos ficticios; la descarga completa requiere una sesión de administrador.'
          : 'Incluye datos de contacto y bancarios; guarda el archivo de forma segura.'}
      </p>
    </div>
  )
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? '')
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}
