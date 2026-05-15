import { createClient } from '@/lib/supabase-server'
import { formatNaira } from '@/lib/format'
import { buildVerifyUrl } from '@/lib/receipts'
import ReceiptRow from './ReceiptRow'

export const dynamic = 'force-dynamic'

type ReceiptWithTxn = {
  id: string
  verification_code: string
  delivered_to: string | null
  delivered_at: string | null
  created_at: string
  transactions: {
    amount_kobo: number | string
    payer_name: string | null
    payer_email: string | null
    description: string | null
    created_at: string
    seller_id: string
  } | null
}

export default async function ReceiptsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!seller) return null

  const { data: receipts } = await supabase
    .from('receipts')
    .select(
      `id, verification_code, delivered_to, delivered_at, created_at,
       transactions!inner(amount_kobo, payer_name, payer_email, description, created_at, seller_id)`,
    )
    .eq('transactions.seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<ReceiptWithTxn[]>()

  const rows = receipts ?? []
  const deliveredCount = rows.filter((r) => r.delivered_at).length

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Receipts
        </p>
        <h1 className="font-serif text-3xl tracking-tight mt-1.5">
          Issued receipts
        </h1>
        <p className="text-sm text-ink-muted mt-2 max-w-lg">
          Every Vend payment generates a verifiable receipt. Buyers can confirm
          authenticity from the public verify link, even years later.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-white border border-line rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Total issued</p>
          <p className="text-2xl font-semibold tnum mt-1">{rows.length}</p>
        </div>
        <div className="bg-white border border-line rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Emailed</p>
          <p className="text-2xl font-semibold tnum mt-1">{deliveredCount}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Receipts without an email are still verifiable by code.
          </p>
        </div>
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted p-6">
            No receipts yet. Each successful payment generates one — start from
            your dashboard&apos;s share card.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              if (!r.transactions) return null
              const verifyUrl = buildVerifyUrl(r.verification_code)
              return (
                <ReceiptRow
                  key={r.id}
                  verificationCode={r.verification_code}
                  verifyUrl={verifyUrl}
                  amountFormatted={formatNaira(Number(r.transactions.amount_kobo))}
                  paidAtIso={r.transactions.created_at}
                  payerName={r.transactions.payer_name}
                  payerEmail={r.transactions.payer_email}
                  description={r.transactions.description}
                  delivered={Boolean(r.delivered_at)}
                />
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
