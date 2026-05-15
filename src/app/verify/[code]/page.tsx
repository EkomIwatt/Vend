import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { formatNaira } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Props = { params: { code: string } }

type ReceiptRow = {
  id: string
  verification_code: string
  delivered_to: string | null
  delivered_at: string | null
  created_at: string
  transactions: {
    id: string
    squad_transaction_ref: string
    amount_kobo: number
    payer_name: string | null
    description: string | null
    status: string
    created_at: string
    sellers: {
      business_name: string
      business_description: string
    } | null
  } | null
}

export default async function VerifyPage({ params }: Props) {
  const code = params.code?.toUpperCase()
  if (!code || code.length < 4) notFound()

  const admin = createAdminClient()

  // Single query, three joins. Receipts RLS allows public select; admin
  // client bypasses anyway. We deliberately do NOT expose BVN, legal name,
  // payer_email, or any seller identity beyond business_name + description.
  const { data: receipt } = await admin
    .from('receipts')
    .select(
      `id, verification_code, delivered_to, delivered_at, created_at,
       transactions (
         id, squad_transaction_ref, amount_kobo, payer_name, description, status, created_at,
         sellers ( business_name, business_description )
       )`,
    )
    .eq('verification_code', code)
    .maybeSingle<ReceiptRow>()

  if (!receipt || !receipt.transactions || !receipt.transactions.sellers) {
    notFound()
  }

  const txn = receipt.transactions
  const seller = txn.sellers!
  const paidAt = new Date(txn.created_at)
  const paidAtStr = paidAt.toLocaleString('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            Verified receipt
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2">
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full bg-primary"
            />
            <span className="text-sm text-primary font-medium">
              Confirmed by Vend
            </span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-6 sm:p-8 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Paid to</p>
          <h1 className="font-serif text-3xl text-ink mt-1 leading-tight">
            {seller.business_name}
          </h1>
          {seller.business_description && (
            <p className="text-sm text-ink-muted mt-1">
              {seller.business_description}
            </p>
          )}

          <div className="mt-6 pb-6 border-b border-line">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Amount
            </p>
            <p className="text-4xl font-semibold tnum text-primary mt-1">
              {formatNaira(txn.amount_kobo)}
            </p>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            {txn.description && (
              <Row label="For">{txn.description}</Row>
            )}
            {txn.payer_name && (
              <Row label="From">{txn.payer_name}</Row>
            )}
            <Row label="Paid on">{paidAtStr}</Row>
            <Row label="Reference">
              <span className="font-mono text-xs">{txn.squad_transaction_ref}</span>
            </Row>
            <Row label="Verification code">
              <span className="font-mono tracking-widest">{receipt.verification_code}</span>
            </Row>
          </dl>
        </div>

        <p className="text-center text-xs text-ink-muted mt-8">
          This receipt is generated and verified by{' '}
          <span className="font-semibold text-primary">Vend</span>. Anyone with
          this link can confirm the payment.
        </p>
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <dt className="text-ink-muted shrink-0">{label}</dt>
      <dd className="text-ink text-right">{children}</dd>
    </div>
  )
}
