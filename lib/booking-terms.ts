export const BOOKING_TERMS_VERSION = '2026-11-03-v2'
export const RESERVATION_DEPOSIT_PERCENT = 30
export const BALANCE_DUE_DAYS_BEFORE_EVENT = 5

export const BOOKING_TERMS_SNAPSHOT = {
  version: BOOKING_TERMS_VERSION,
  reservationDepositPercent: RESERVATION_DEPOSIT_PERCENT,
  balanceDueDaysBeforeEvent: BALANCE_DUE_DAYS_BEFORE_EVENT,
  missedBalancePolicy: {
    depositRefundPercent: 0,
    providerSharePercent: 90,
    platformSharePercent: 10,
  },
  cancellationPolicy: [
    { window: 'mas_7_dias', refundPercent: 100 },
    { window: '72_horas_a_7_dias', refundPercent: 80 },
    { window: '24_a_72_horas', refundPercent: 50 },
    { window: 'menos_24_horas', refundPercent: 0 },
  ],
} as const
