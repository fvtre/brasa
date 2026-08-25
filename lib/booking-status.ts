export function bookingStatusLabel(status: string | null | undefined) {
  const value = String(status || 'pendiente')
  const labels: Record<string, string> = {
    confirmada: 'Confirmada',
    completada: 'Completada',
    cancelada: 'Cancelada',
    rechazada: 'Rechazada',
    expirada: 'Solicitud expirada',
    esperando_confirmacion: 'Esperando confirmación',
    pendiente: 'Pendiente',
  }

  return labels[value] || value.replaceAll('_', ' ')
}

export function bookingStatusClasses(status: string | null | undefined) {
  switch (status) {
    case 'confirmada':
    case 'completada':
      return 'bg-emerald-500/10 text-emerald-700'
    case 'cancelada':
    case 'rechazada':
      return 'bg-destructive/10 text-destructive'
    case 'expirada':
      return 'bg-orange-500/10 text-orange-700'
    case 'esperando_confirmacion':
    case 'pendiente':
      return 'bg-amber-500/10 text-amber-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
