import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { paymentProvider } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/squad
 *
 * Squad fires this whenever an inbound payment lands on one of our virtual
 * accounts (including sandbox simulate-payment triggers).
 *
 * Contract:
 *   - Read the RAW body (not parsed) — signature is computed over byte content
 *   - Verify HMAC-SHA512 v3 signature from the header before trusting anything
 *   - Resolve seller via customer_identifier (Squad echoes back what we sent)
 *   - Idempotent insert: unique constraint on transactions.squad_transaction_ref
 *   - Match against pending_payments to attach buyer-entered payer info
 *   - Always return 200 quickly on signed payloads — Squad retries on non-2xx
 *
 * Squad uses different header names in different doc generations. We accept
 * the v3 name first, then fall back.
 */
export async function POST(request: Request) {
  // 1. Read raw body — required for signature verification
  const rawBody = await request.text()

  // 2. Verify signature
  const signature =
    request.headers.get('x-squad-encrypted-body') ??
    request.headers.get('x-squad-signature') ??
    ''

  if (!paymentProvider.verifyWebhook(rawBody, signature)) {
    console.warn('[webhook] rejected: signature mismatch')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 3. Parse
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = paymentProvider.parseWebhook(payload)

  // Only act on successful payments. Failed/other events are acknowledged
  // (200) so Squad stops retrying, but we don't write anything.
  if (parsed.eventType !== 'payment.success') {
    console.log('[webhook] ignored event:', parsed.eventType, parsed.transactionRef)
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (!parsed.transactionRef || !parsed.customerIdentifier) {
    console.warn('[webhook] missing ref or customer_identifier', parsed)
    return NextResponse.json({ ok: true, ignored: true })
  }

  const admin = createAdminClient()

  // 4. Idempotency check — if we've already processed this ref, ack and exit
  const { data: existing } = await admin
    .from('transactions')
    .select('id')
    .eq('squad_transaction_ref', parsed.transactionRef)
    .maybeSingle()

  if (existing) {
    console.log('[webhook] duplicate, already processed:', parsed.transactionRef)
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // 5. Resolve seller
  const { data: seller, error: sellerError } = await admin
    .from('sellers')
    .select('id')
    .eq('squad_customer_identifier', parsed.customerIdentifier)
    .maybeSingle()

  if (sellerError || !seller) {
    // Webhook arrived for a customer_identifier we don't recognize. Possibly
    // an orphan virtual account from a rolled-back signup. Ack to stop retries.
    console.warn('[webhook] unknown customer_identifier:', parsed.customerIdentifier)
    return NextResponse.json({ ok: true, ignored: true })
  }

  // 6. Look up a matching pending_payment to copy payer info from
  const nowIso = new Date().toISOString()
  const { data: pending } = await admin
    .from('pending_payments')
    .select('*')
    .eq('seller_id', seller.id)
    .eq('amount_kobo', parsed.amountKobo)
    .is('matched_transaction_id', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 7. Insert the transaction. Prefer pending_payment data (set by the buyer
  // explicitly), then Squad's payload, then null.
  const payerName = pending?.payer_name ?? parsed.payerName ?? null
  const payerEmail = pending?.payer_email ?? parsed.payerEmail ?? null
  const description = pending?.payer_description ?? parsed.description ?? null

  const { data: inserted, error: insertError } = await admin
    .from('transactions')
    .insert({
      seller_id: seller.id,
      squad_transaction_ref: parsed.transactionRef,
      amount_kobo: parsed.amountKobo,
      payer_name: payerName,
      payer_email: payerEmail,
      description,
      status: 'success',
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    // Unique-constraint violation = race with another concurrent webhook;
    // treat as idempotent success. Anything else is a real DB problem.
    const isConflict =
      insertError?.code === '23505' ||
      insertError?.message?.toLowerCase().includes('duplicate')
    if (isConflict) {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    console.error('[webhook] transaction insert failed:', insertError)
    return NextResponse.json({ error: 'DB write failed' }, { status: 500 })
  }

  // 8. Mark the pending_payment as matched (best-effort; not fatal if it fails)
  if (pending) {
    await admin
      .from('pending_payments')
      .update({ matched_transaction_id: inserted.id })
      .eq('id', pending.id)
  }

  console.log(
    '[webhook] transaction recorded:',
    parsed.transactionRef,
    '·',
    parsed.amountKobo,
    'kobo',
  )

  return NextResponse.json({ ok: true, transactionId: inserted.id })
}

// Squad sends only POST, but accept GET for a friendly response on accidental
// browser visits and so the route exists at the URL we register.
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: 'Vend webhook receiver. POST only.',
  })
}
