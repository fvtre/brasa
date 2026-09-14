import 'server-only'

import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} from 'transbank-sdk'

export function getWebpayTransaction() {
  const environment = process.env.TRANSBANK_ENVIRONMENT || 'integration'

  if (environment === 'production') {
    const commerceCode = process.env.TRANSBANK_COMMERCE_CODE
    const apiKey = process.env.TRANSBANK_API_KEY
    if (!commerceCode || !apiKey) {
      throw new Error('Faltan las credenciales productivas de Transbank.')
    }
    return new WebpayPlus.Transaction(
      new Options(commerceCode, apiKey, Environment.Production)
    )
  }

  return new WebpayPlus.Transaction(
    new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    )
  )
}

export function getApplicationUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(request.url).origin
}
