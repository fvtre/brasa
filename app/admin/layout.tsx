import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth'
export default async function AdminLayout({children}:{children:ReactNode}){await requireRole(['administrador']);return children}
