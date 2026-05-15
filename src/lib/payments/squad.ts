import crypto from 'crypto'
import type {
  PaymentProvider,
  CreateVirtualAccountInput,
  CreateVirtualAccountOutput,
  ParsedWebhook,
} from './types'

/**
 * Squad (HabariPay) implementation of PaymentProvider.
 *
 * Phase 1 confirmed:
 *   - Auth: Bearer sandbox_sk_... in Authorization header
 *   - POST /virtual-account creates Customer Model virtual account
 *   - Sandbox does NOT validate BVN content (production will)
 *   - beneficiary_account is REQUIRED in sandbox despite docs saying optional
 *   - email must be a real format (no .local TLDs)
 *
 * Webhook signature: HMAC-SHA512 over the v3 hash input
 *   ${transaction_reference}|${virtual_account_number}|${currency}|${principal_amount}|${settled_amount}|${customer_identifier}
 */
export class SquadProvider implements PaymentProvider {
  private readonly secretKey: string
  private readonly baseUrl: string

  constructor() {
    const secretKey = process.env.SQUAD_SECRET_KEY
    const baseUrl = process.env.SQUAD_BASE_URL ?? 'https://sandbox-api-d.squadco.com'

    if (!secretKey) {
      throw new Error('SQUAD_SECRET_KEY is not set')
    }

    this.secretKey = secretKey
    this.baseUrl = baseUrl
  }

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<CreateVirtualAccountOutput> {
    const response = await fetch(`${this.baseUrl}/virtual-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_identifier: input.customerIdentifier,
        first_name: input.legalFirstName,
        middle_name: input.legalMiddleName,
        last_name: input.legalLastName,
        bvn: input.bvn,
        dob: input.dob,
        gender: input.gender,
        mobile_num: input.phone,
        email: input.email,
        address: input.address,
        beneficiary_account: input.beneficiaryAccount,
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok || !body.success) {
      throw new Error(
        `Squad createVirtualAccount failed: ${body?.message ?? response.statusText}`,
      )
    }

    return {
      accountNumber: body.data.virtual_account_number,
      bankCode: body.data.bank_code,
      customerIdentifier: body.data.customer_identifier,
    }
  }

  /**
   * Sandbox-only. Fires a simulated inbound transfer to the given virtual
   * account, which triggers Squad's webhook to our /api/webhooks/squad
   * endpoint. Amount is sent to Squad in naira (whole units, no kobo).
   */
  async simulatePayment(input: {
    virtualAccountNumber: string
    amountKobo: number
  }): Promise<{ reference: string }> {
    const amountNaira = (input.amountKobo / 100).toFixed(2)

    const response = await fetch(`${this.baseUrl}/virtual-account/simulate/payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        virtual_account_number: input.virtualAccountNumber,
        amount: amountNaira,
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok || (body.success !== undefined && !body.success)) {
      throw new Error(
        `Squad simulatePayment failed: ${body?.message ?? response.statusText}`,
      )
    }

    return {
      reference: body?.data?.transaction_reference ?? body?.data?.reference ?? '',
    }
  }

  /**
   * Verify Squad's v3 webhook signature. Read the raw body (NOT parsed JSON)
   * and the `x-squad-encrypted-body` header (Squad's v3 signature header name —
   * older docs say `x-squad-signature`, but v3 uses the new header).
   */
  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!signature) return false
    let parsed: any
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      return false
    }

    const t = parsed?.transaction_reference ?? parsed?.data?.transaction_reference ?? ''
    const v = parsed?.virtual_account_number ?? parsed?.data?.virtual_account_number ?? ''
    const c = parsed?.currency ?? parsed?.data?.currency ?? 'NGN'
    const p = parsed?.principal_amount ?? parsed?.data?.principal_amount ?? ''
    const s = parsed?.settled_amount ?? parsed?.data?.settled_amount ?? ''
    const ci = parsed?.customer_identifier ?? parsed?.data?.customer_identifier ?? ''

    const hashInput = `${t}|${v}|${c}|${p}|${s}|${ci}`
    const expected = crypto
      .createHmac('sha512', this.secretKey)
      .update(hashInput)
      .digest('hex')

    // Constant-time comparison
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(signature, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  parseWebhook(payload: unknown): ParsedWebhook {
    const p = payload as Record<string, any>
    // Squad's webhook body is typically { event, transaction_reference, ... }
    // at the top level, or wrapped in { data: {...} }. Handle both.
    const data = p?.data ?? p

    const principalKobo = nairaStringToKobo(
      data.principal_amount ?? data.transaction_amount ?? '0',
    )
    const settledKobo = nairaStringToKobo(data.settled_amount ?? data.principal_amount ?? '0')

    // We treat principal_amount as the displayed amount (what payer paid).
    const amountKobo = principalKobo || settledKobo

    const eventType: ParsedWebhook['eventType'] =
      data.transaction_status === 'success' || p.event === 'payment.success'
        ? 'payment.success'
        : data.transaction_status === 'failed' || p.event === 'payment.failed'
          ? 'payment.failed'
          : 'other'

    return {
      eventType,
      transactionRef: String(data.transaction_reference ?? ''),
      amountKobo,
      payerName: data.payer_name ?? data.sender_name ?? undefined,
      payerEmail: data.payer_email ?? undefined,
      description: data.remarks ?? data.description ?? undefined,
      customerIdentifier: String(data.customer_identifier ?? ''),
      virtualAccountNumber: String(data.virtual_account_number ?? ''),
    }
  }
}

function nairaStringToKobo(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100)
  const cleaned = input.replace(/,/g, '').trim()
  const naira = parseFloat(cleaned)
  if (Number.isNaN(naira)) return 0
  return Math.round(naira * 100)
}
