/**
 * PaymentProvider interface.
 *
 * Per master context Section 3: "Architect the codebase with a PaymentProvider
 * abstraction from day one — Squad is the first implementation, not a
 * hard-coupled dependency."
 *
 * Squad implements this. Future providers (Paystack, Flutterwave, Vend's own
 * direct rails) will implement the same shape. Application code never imports
 * Squad directly — it imports the provider singleton from ./index.ts.
 */

export type CreateVirtualAccountInput = {
  customerIdentifier: string  // our unique ID, echoed back on every webhook
  legalFirstName: string
  legalMiddleName: string
  legalLastName: string
  bvn: string
  dob: string                 // mm/dd/yyyy — Squad's required format
  gender: '1' | '2'           // 1 male, 2 female
  phone: string               // 11 digits, no country code
  email: string
  address: string
  beneficiaryAccount: string  // GTBank account number for settlement
}

export type CreateVirtualAccountOutput = {
  accountNumber: string
  bankCode: string
  customerIdentifier: string
}

export type ParsedWebhook = {
  eventType: 'payment.success' | 'payment.failed' | 'other'
  transactionRef: string
  amountKobo: number
  payerName?: string
  payerEmail?: string
  description?: string
  customerIdentifier: string  // resolves back to our seller
}

export interface PaymentProvider {
  createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<CreateVirtualAccountOutput>

  verifyWebhook(rawBody: string, signature: string): boolean
  parseWebhook(payload: unknown): ParsedWebhook
  simulatePayment(input: {
    virtualAccountNumber: string
    amountKobo: number
  }): Promise<{ reference: string }>
}
