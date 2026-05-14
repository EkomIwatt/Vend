import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { paymentProvider } from '@/lib/payments'

/**
 * POST /api/simulate-payment
 *
 * Called by the /pay/[sellerId] form. Stages payer info into pending_payments
 * so the webhook handler can attach it to the inbound transaction, then asks
 * Squad's sandbox to simulate a payment to the seller's virtual account.
 *
 * Body:
 *   { sellerId, amountKobo, payerName, payerEmail, description? }
 *
 * In production (real bank transfers), this endpoint wouldn't exist — the
 * buyer would just transfer from their bank app. For the sandbox demo, this
 * is how we trigger the webhook flow without real money.
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sellerId, amountKobo, payerName, payerEmail, description } = body
  if (!sellerId || typeof sellerId !== 'string') {
    return NextResponse.json({ error: 'sellerId is required' }, { status: 400 })
  }
  if (typeof amountKobo !== 'number' || !Number.isFinite(amountKobo) || amountKobo <= 0) {
    return NextResponse.json({ error: 'amountKobo must be a positive number' }, { status: 400 })
  }
  if (!payerName || typeof payerName !== 'string') {
    return NextResponse.json({ error: 'payerName is required' }, { status: 400 })
  }
  if (!payerEmail || typeof payerEmail !== 'string' || !payerEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid payerEmail is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Look up the seller's virtual account number
  const { data: seller, error: lookupError } = await admin
    .from('sellers')
    .select('id, squad_virtual_account_number')
    .eq('id', sellerId)
    .maybeSingle()

  if (lookupError || !seller || !seller.squad_virtual_account_number) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  // Stage payer info BEFORE calling Squad so the webhook (which can fire
  // within seconds) can find it. If Squad fails, the row expires harmlessly.
  const { error: pendingError } = await admin.from('pending_payments').insert({
    seller_id: seller.id,
    amount_kobo: amountKobo,
    payer_name: payerName,
    payer_email: payerEmail,
    payer_description: description ?? null,
  })
  if (pendingError) {
    return NextResponse.json(
      { error: `Could not stage payment: ${pendingError.message}` },
      { status: 500 },
    )
  }

  // Trigger Squad's sandbox simulate-payment
  try {
    await paymentProvider.simulatePayment({
      virtualAccountNumber: seller.squad_virtual_account_number,
      amountKobo,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment provider error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
