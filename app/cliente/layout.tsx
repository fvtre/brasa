import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth'
export default async function ClientLayout({children}:{children:ReactNode}){await requireRole(['cliente','administrador']);return children}
