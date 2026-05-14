import { SquadProvider } from './squad'
import type { PaymentProvider } from './types'

/**
 * The active payment provider. Application code imports `paymentProvider`
 * from this file and never imports SquadProvider directly. Swap providers
 * here in one place when needed.
 */
export const paymentProvider: PaymentProvider = new SquadProvider()
