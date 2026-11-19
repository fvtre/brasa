import { notFound } from 'next/navigation'

import { AdminDashboardView, type AdminDashboardData } from '@/components/admin-dashboard-view'

export const dynamic = 'force-dynamic'

const previewData: AdminDashboardData = {
  activeUsers: 248,
  clients: 192,
  activeProviders: 56,
  verifiedProviders: 41,
  recentBookings: 18,
  bookingsThirtyDays: 74,
  collected: 4_850_000,
  pendingPayments: 680_000,
  conversion: 62,
  paymentRevenueThirtyDays: 3_120_000,
  cancellationCount: 9,
  totalBookings: 119,
  repeatClients: 14,
  monthlyBookings: [
    { label: 'jun', count: 8 },
    { label: 'jul', count: 12 },
    { label: 'ago', count: 9 },
    { label: 'sept', count: 16 },
    { label: 'oct', count: 11 },
    { label: 'nov', count: 18 },
  ],
  topCategories: [
    { name: 'Parrilleros', bookings: 18, amount: 1_260_000 },
    { name: 'Catering', bookings: 14, amount: 1_050_000 },
    { name: 'Bartenders', bookings: 11, amount: 715_000 },
  ],
  topClients: [
    { name: 'Camila R.', bookings: 4 },
    { name: 'Diego M.', bookings: 3 },
    { name: 'Francisca P.', bookings: 2 },
  ],
  exportCategories: [
    { name: 'Parrilleros', bookings: 18, amount: 1_260_000 },
    { name: 'Catering', bookings: 14, amount: 1_050_000 },
    { name: 'Bartenders', bookings: 11, amount: 715_000 },
  ],
  exportClients: [
    { name: 'Camila R.', bookings: 4 },
    { name: 'Diego M.', bookings: 3 },
    { name: 'Francisca P.', bookings: 2 },
  ],
  exportBookings: [],
  statusSummary: [
    { label: 'Pendientes', count: 18 },
    { label: 'Esperando confirmación', count: 12 },
    { label: 'Confirmadas', count: 27 },
    { label: 'En curso', count: 4 },
    { label: 'Completadas', count: 49 },
    { label: 'Canceladas', count: 9 },
  ],
  recent: [
    {
      id: 'preview-1',
      code: 'BR-DEMO001',
      event_name: 'Cumpleaños en Las Condes',
      event_date: '2026-12-05',
      status: 'confirmada',
      total: 345000,
      clientName: 'Camila R.',
    },
    {
      id: 'preview-2',
      code: 'BR-DEMO002',
      event_name: 'Matrimonio en Providencia',
      event_date: '2026-12-12',
      status: 'esperando_confirmacion',
      total: 1280000,
      clientName: 'Diego M.',
    },
    {
      id: 'preview-3',
      code: 'BR-DEMO003',
      event_name: 'Asado familiar',
      event_date: '2026-11-29',
      status: 'en_curso',
      total: 215000,
      clientName: 'Francisca P.',
    },
  ],
}

export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return <AdminDashboardView data={previewData} preview />
}
