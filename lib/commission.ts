export const BRASA_COMMISSION_RATE = 0.1

export function calculateBrasaCommission(amount: number) {
  return Math.round(Math.max(0, amount) * BRASA_COMMISSION_RATE)
}

export function calculateProviderPayout(amount: number) {
  return Math.max(0, amount - calculateBrasaCommission(amount))
}
