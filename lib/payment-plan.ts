import {
  BALANCE_DUE_DAYS_BEFORE_EVENT,
  RESERVATION_DEPOSIT_PERCENT,
} from '@/lib/booking-terms'
import { eventDateInSantiago } from '@/lib/cancellation-policy'

export type PaymentStage = 'deposit' | 'balance' | 'full'

export type BookingPaymentPlan = {
  stage: PaymentStage
  amountDueNow: number
  depositAmount: number
  balanceAmount: number
  balanceDueAt: string | null
  paidAmount: number
  total: number
}

export function calculateBookingPaymentPlan(input: {
  eventDate: string
  eventTime: string
  paidAmount?: number
  total: number
  now?: Date
}): BookingPaymentPlan {
  const total = Math.max(0, Math.round(input.total))
  const paidAmount = Math.min(total, Math.max(0, Math.round(input.paidAmount || 0)))
  const now = input.now || new Date()
  const eventStartsAt = eventDateInSantiago(input.eventDate, input.eventTime)
  const balanceDueAtDate = new Date(
    eventStartsAt.getTime() - BALANCE_DUE_DAYS_BEFORE_EVENT * 24 * 60 * 60 * 1000,
  )
  const depositAmount = Math.round(total * RESERVATION_DEPOSIT_PERCENT / 100)
  const balanceAmount = total - depositAmount

  if (paidAmount > 0) {
    return {
      stage: 'balance',
      amountDueNow: total - paidAmount,
      depositAmount,
      balanceAmount,
      balanceDueAt: balanceDueAtDate.toISOString(),
      paidAmount,
      total,
    }
  }

  if (now >= balanceDueAtDate) {
    return {
      stage: 'full',
      amountDueNow: total,
      depositAmount: total,
      balanceAmount: 0,
      balanceDueAt: null,
      paidAmount,
      total,
    }
  }

  return {
    stage: 'deposit',
    amountDueNow: depositAmount,
    depositAmount,
    balanceAmount,
    balanceDueAt: balanceDueAtDate.toISOString(),
    paidAmount,
    total,
  }
}
