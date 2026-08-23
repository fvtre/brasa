export function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CL").format(value)
}
