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
   * Verify Squad's webhook signature.
   *
   * Algorithm (from Squad's official docs, confirmed 2026-05-15):
   *   - Header: `x-squad-encrypted-body`
   *   - Hash input: `JSON.stringify(<parsed body>)` — the entire body re-serialized
   *   - HMAC-SHA512, key = merchant secret key
   *   - Output: uppercase hex
   *
   * Note the earlier internal spec claimed a 6-piped-fields hash input. That
   * was wrong — the real algorithm hashes the full normalized JSON body.
   */
  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!signature) return false
    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      return false
    }

    const normalized = JSON.stringify(parsed)
    const expected = crypto
      .createHmac('sha512', this.secretKey)
      .update(normalized)
      .digest('hex')
      .toUpperCase()

    // Buffer.from accepts upper or lower hex equivalently. Constant-time compare.
    let a: Buffer
    let b: Buffer
    try {
      a = Buffer.from(expected, 'hex')
      b = Buffer.from(signature, 'hex')
    } catch {
      return false
    }
    if (a.length !== b.length || a.length === 0) return false
    return crypto.timingSafeEqual(a, b)
  }

  parseWebhook(payload: unknown): ParsedWebhook {
    const p = payload as Record<string, any>
    // Squad's webhook body shapes seen in the wild:
    //   - { Event, TransactionRef, Body: { ... } } — card charge style
    //   - { event, data: { ... } } — generic v3 style
    //   - flat { transaction_reference, virtual_account_number, ... } — virtual account inbound
    const data = (p?.Body ?? p?.data ?? p) as Record<string, any>

    const principalKobo = nairaStringToKobo(
      data.principal_amount ?? data.amount ?? data.transaction_amount ?? '0',
    )
    const settledKobo = nairaStringToKobo(
      data.settled_amount ?? data.merchant_amount ?? data.principal_amount ?? '0',
    )
    const amountKobo = principalKobo || settledKobo

    const transactionRef = String(
      data.transaction_reference ??
        p.TransactionRef ??
        data.transaction_ref ??
        p.transaction_ref ??
        '',
    )

    // Success detection. Squad's virtual-account inbound webhooks frequently
    // have NO event/status field — they're only fired when money lands.
    // So: explicit success-ish strings win; otherwise infer from "ref + amount"
    // presence; only mark failed if there's an explicit failed signal.
    const eventStr = String(p.Event ?? p.event ?? '').toLowerCase()
    const statusStr = String(data.transaction_status ?? data.status ?? '').toLowerCase()
    const isFailed = eventStr.includes('fail') || statusStr === 'failed'
    const isExplicitSuccess =
      eventStr.includes('success') ||
      statusStr === 'success' ||
      statusStr === 'successful'
    const isImpliedSuccess =
      !eventStr && !statusStr && transactionRef.length > 0 && amountKobo > 0

    const eventType: ParsedWebhook['eventType'] = isFailed
      ? 'payment.failed'
      : isExplicitSuccess || isImpliedSuccess
        ? 'payment.success'
        : 'other'

    return {
      eventType,
      transactionRef,
      amountKobo,
      payerName: data.payer_name ?? data.sender_name ?? data.customer_name ?? undefined,
      payerEmail: data.payer_email ?? data.email ?? undefined,
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
