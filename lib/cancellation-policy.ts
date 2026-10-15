export const BRASA_TIME_ZONE = 'America/Santiago'

export type CancellationPolicyCode =
  | 'mas_7_dias'
  | '72_horas_a_7_dias'
  | '24_a_72_horas'
  | 'menos_24_horas'

export type CancellationQuote = {
  eligible: boolean
  hoursBeforeEvent: number
  originalAmount: number
  refundAmount: number
  retainedAmount: number
  providerCompensation: number
  platformFee: number
  policyCode: CancellationPolicyCode
  policyLabel: string
}

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

export function eventDateInSantiago(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute, second = 0] = time.split(':').map(Number)
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  let candidate = targetAsUtc

  // Dos iteraciones resuelven correctamente el offset de Santiago incluso
  // alrededor de cambios de horario de verano.
  for (let index = 0; index < 2; index += 1) {
    const parts = partsInTimeZone(new Date(candidate), BRASA_TIME_ZONE)
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    candidate += targetAsUtc - representedAsUtc
  }

  return new Date(candidate)
}

export function calculateCancellationQuote(
  originalAmount: number,
  eventStartsAt: Date,
  now = new Date(),
): CancellationQuote {
  const amount = Math.max(0, Math.round(originalAmount))
  const hoursBeforeEvent = (eventStartsAt.getTime() - now.getTime()) / 3_600_000

  let policyCode: CancellationPolicyCode
  let policyLabel: string
  let refundRate: number
  let platformRate = 0

  if (hoursBeforeEvent > 168) {
    policyCode = 'mas_7_dias'
    policyLabel = 'Más de 7 días: devolución total'
    refundRate = 1
  } else if (hoursBeforeEvent >= 72) {
    policyCode = '72_horas_a_7_dias'
    policyLabel = 'Entre 72 horas y 7 días: devolución del 80%'
    refundRate = 0.8
  } else if (hoursBeforeEvent >= 24) {
    policyCode = '24_a_72_horas'
    policyLabel = 'Entre 24 y 72 horas: devolución del 50%'
    refundRate = 0.5
  } else {
    policyCode = 'menos_24_horas'
    policyLabel = 'Menos de 24 horas: sin devolución'
    refundRate = 0
    platformRate = 0.1
  }

  const refundAmount = Math.round(amount * refundRate)
  const retainedAmount = amount - refundAmount
  const platformFee = Math.round(amount * platformRate)

  return {
    eligible: hoursBeforeEvent > 0,
    hoursBeforeEvent,
    originalAmount: amount,
    refundAmount,
    retainedAmount,
    providerCompensation: retainedAmount - platformFee,
    platformFee,
    policyCode,
    policyLabel,
  }
}
