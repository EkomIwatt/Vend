import { createAdminClient } from '@/lib/supabase-admin'
import { summarizeWeek } from '@/lib/ai/gemini'

type TxnRow = {
  amount_kobo: number
  description: string | null
  ai_category: string | null
  created_at: string
}

/**
 * Cached weekly summary.
 *
 * Why caching: Gemini free tier rate-limits at ~10 RPM. The dashboard
 * regenerates on every pageload, so rapid reloads (demo, dev iteration)
 * return 429 and the banner disappears. We cache one row per seller keyed
 * by a fingerprint of the week's transactions; the cache is read on every
 * load and Gemini is only called when the fingerprint changes (new payment,
 * week-window slide).
 *
 * If Gemini fails (rate limit, network, key missing) we return the previously
 * cached summary if any — stale text beats no text during the demo.
 */
export async function getOrCreateWeekSummary(input: {
  sellerId: string
  businessName: string
  firstName?: string
  transactions: TxnRow[]
}): Promise<string | null> {
  if (input.transactions.length === 0) return null

  const fingerprint = computeFingerprint(input.transactions)
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('seller_summaries')
    .select('summary_text, fingerprint')
    .eq('seller_id', input.sellerId)
    .maybeSingle()

  if (existing && existing.fingerprint === fingerprint) {
    return existing.summary_text
  }

  const fresh = await summarizeWeek({
    businessName: input.businessName,
    firstName: input.firstName,
    transactions: input.transactions,
  })

  if (!fresh) {
    return existing?.summary_text ?? null
  }

  await admin.from('seller_summaries').upsert(
    {
      seller_id: input.sellerId,
      summary_text: fresh,
      fingerprint,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'seller_id' },
  )

  return fresh
}

function computeFingerprint(txns: TxnRow[]): string {
  const count = txns.length
  const totalKobo = txns.reduce((acc, t) => acc + Number(t.amount_kobo), 0)
  const lastIso = txns.reduce((latest, t) => (t.created_at > latest ? t.created_at : latest), '')
  return `${count}:${totalKobo}:${lastIso}`
}
