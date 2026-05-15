import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase-server'
import { formatAccountNumber, bankNameFromCode, formatNaira } from '@/lib/format'
import { getOrCreateWeekSummary } from '@/lib/ai/summary-cache'
import ShareCard from './ShareCard'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, { label: string; tone: string }> = {
  food: { label: 'Food', tone: 'bg-amber-100 text-amber-900' },
  drinks: { label: 'Drinks', tone: 'bg-sky-100 text-sky-900' },
  services: { label: 'Services', tone: 'bg-violet-100 text-violet-900' },
  retail: { label: 'Retail', tone: 'bg-emerald-100 text-emerald-900' },
  personal_care: { label: 'Personal care', tone: 'bg-rose-100 text-rose-900' },
  education: { label: 'Education', tone: 'bg-indigo-100 text-indigo-900' },
  transport: { label: 'Transport', tone: 'bg-orange-100 text-orange-900' },
  entertainment: { label: 'Entertainment', tone: 'bg-pink-100 text-pink-900' },
  other: { label: 'Other', tone: 'bg-stone-200 text-stone-800' },
}

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Layout has already enforced auth; this assertion is just for TypeScript.
  if (!user) return null

  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Layout redirects if no seller row; this is defensive.
  if (!seller) return null

  // Fetch last 30 days of successful transactions
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, amount_kobo, payer_name, payer_email, description, ai_category, status, created_at')
    .eq('seller_id', seller.id)
    .eq('status', 'success')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  const txns = transactions ?? []
  const totalKobo30d = txns.reduce((acc, t) => acc + Number(t.amount_kobo), 0)

  // Filter to last 7 days for the AI summary
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekTxns = txns.filter((t) => new Date(t.created_at) >= weekAgo)
  const totalKobo7d = weekTxns.reduce((acc, t) => acc + Number(t.amount_kobo), 0)

  // First name for the AI greeting. Prefer the business-name prefix ("Tomi's
  // Braids" → "Tomi") since that's how the seller actually identifies; fall
  // back to legal_first_name.
  const businessFirstWord = String(seller.business_name).split(/\s|'/)[0]
  const greetingName =
    businessFirstWord && businessFirstWord.length > 1
      ? businessFirstWord
      : seller.legal_first_name

  const summary = await getOrCreateWeekSummary({
    sellerId: seller.id,
    businessName: seller.business_name,
    firstName: greetingName,
    transactions: weekTxns,
  })

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const payUrl = `${baseUrl}/pay/${seller.id}`
  const qrDataUrl = await QRCode.toDataURL(payUrl, {
    width: 280,
    margin: 1,
    color: { dark: '#0F4C3A', light: '#FAF7F2' },
  })

  return (
    <>
      <div className="max-w-3xl space-y-8">
        <header className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Vend</p>
            <h1 className="font-serif text-3xl tracking-tight mt-1">
              {seller.business_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs uppercase tracking-wide bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">
              {seller.tier}
            </span>
            <span
              className="text-xs uppercase tracking-wide bg-primary text-white px-2.5 py-1 rounded-md font-medium tnum"
              title="Trust score combines payment regularity, time on Vend, and customer reviews. Buyers see this on your payment page."
            >
              Trust {Number(seller.trust_score ?? 0).toFixed(1)}
            </span>
          </div>
        </header>

        {/* AI weekly summary banner */}
        {summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-5 py-4 flex items-start gap-3">
            <div className="text-primary text-xl leading-none mt-0.5">✦</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-primary font-medium">
                This week
              </p>
              <p className="text-sm mt-1 leading-snug">{summary}</p>
            </div>
          </div>
        )}

        {/* Inflow cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-line rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              This week
            </p>
            <p className="text-2xl font-semibold tnum mt-1">{formatNaira(totalKobo7d)}</p>
            <p className="text-xs text-ink-muted mt-0.5 tnum">
              {weekTxns.length} payment{weekTxns.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="bg-white border border-line rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Last 30 days</p>
            <p className="text-2xl font-semibold tnum mt-1">{formatNaira(totalKobo30d)}</p>
            <p className="text-xs text-ink-muted mt-0.5 tnum">
              {txns.length} payment{txns.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-line rounded-lg p-6">
          <p className="text-sm text-ink-muted mb-1">Your dedicated account</p>
          <p className="text-3xl font-semibold tnum tracking-wide">
            {formatAccountNumber(seller.squad_virtual_account_number)}
          </p>
          <p className="text-sm text-ink-muted mt-2">
            {bankNameFromCode(seller.squad_bank_code)}
            {' · '}
            <span className="uppercase">
              {seller.legal_first_name} {seller.legal_last_name}
            </span>
          </p>
          <div className="border-t border-line mt-5 pt-5 text-sm text-ink-muted">
            Anyone can pay this account from any Nigerian bank app. The money lands
            in your Vend dashboard, not in your personal account.
          </div>
        </div>

        <ShareCard payUrl={payUrl} qrDataUrl={qrDataUrl} businessName={seller.business_name} />

        <div className="bg-white border border-line rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold">Recent payments</h2>
            <span className="text-xs text-ink-muted tnum">
              {txns.length === 0 ? 'No payments yet' : `${txns.length} in last 30 days`}
            </span>
          </div>

          {txns.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No payments yet. Share your payment page above — once a customer
              sends money, it&apos;ll appear here within seconds.
            </p>
          ) : (
            <ul className="divide-y divide-line -mx-2">
              {txns.map((t) => (
                <li key={t.id} className="px-2 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {t.payer_name ?? 'Anonymous'}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {formatRelativeDate(t.created_at)}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  {t.ai_category && CATEGORY_LABELS[t.ai_category] && (
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_LABELS[t.ai_category].tone}`}
                    >
                      {CATEGORY_LABELS[t.ai_category].label}
                    </span>
                  )}
                  <p className="font-semibold tnum shrink-0">
                    +{formatNaira(Number(t.amount_kobo))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-ink-muted text-center pt-4">
          Vend is in sandbox mode. No real money will be sent or received.
        </p>
      </div>
    </>
  )
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}
