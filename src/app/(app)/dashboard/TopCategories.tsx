import { formatNaira } from '@/lib/format'

type Txn = {
  amount_kobo: number | string
  ai_category: string | null
}

type CategoryMeta = { label: string; tone: string; bar: string }

const CATEGORY_LABELS: Record<string, CategoryMeta> = {
  food: { label: 'Food', tone: 'bg-amber-100 text-amber-900', bar: 'bg-amber-500' },
  drinks: { label: 'Drinks', tone: 'bg-sky-100 text-sky-900', bar: 'bg-sky-500' },
  services: { label: 'Services', tone: 'bg-violet-100 text-violet-900', bar: 'bg-violet-500' },
  retail: { label: 'Retail', tone: 'bg-emerald-100 text-emerald-900', bar: 'bg-emerald-500' },
  personal_care: { label: 'Personal care', tone: 'bg-rose-100 text-rose-900', bar: 'bg-rose-500' },
  education: { label: 'Education', tone: 'bg-indigo-100 text-indigo-900', bar: 'bg-indigo-500' },
  transport: { label: 'Transport', tone: 'bg-orange-100 text-orange-900', bar: 'bg-orange-500' },
  entertainment: { label: 'Entertainment', tone: 'bg-pink-100 text-pink-900', bar: 'bg-pink-500' },
  other: { label: 'Other', tone: 'bg-stone-200 text-stone-800', bar: 'bg-stone-400' },
}

/**
 * Top revenue categories for the period, derived from Gemini-assigned
 * ai_category labels. Uncategorized transactions (e.g. ones that landed
 * before the categorizer was wired, or where Gemini failed) are grouped
 * into "Uncategorized" so the totals still reconcile.
 */
export default function TopCategories({ transactions }: { transactions: Txn[] }) {
  const totals = new Map<string, { kobo: number; count: number }>()
  let grandTotal = 0
  for (const t of transactions) {
    const key = t.ai_category ?? '__uncategorized'
    const kobo = Number(t.amount_kobo)
    grandTotal += kobo
    const prev = totals.get(key) ?? { kobo: 0, count: 0 }
    totals.set(key, { kobo: prev.kobo + kobo, count: prev.count + 1 })
  }

  const ranked = [...totals.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.kobo - a.kobo)
    .slice(0, 4)

  return (
    <div className="bg-white border border-line rounded-lg p-5 sm:p-6">
      <h2 className="font-semibold">Top categories</h2>
      <p className="text-xs text-ink-muted mt-0.5">Last 7 days</p>

      {ranked.length === 0 ? (
        <p className="text-sm text-ink-muted mt-4">
          Categories appear once Gemini has labeled this week&apos;s payments.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ranked.map((c) => {
            const meta = CATEGORY_LABELS[c.key] ?? {
              label: 'Uncategorized',
              tone: 'bg-stone-100 text-stone-700',
              bar: 'bg-stone-300',
            }
            const pct = grandTotal === 0 ? 0 : Math.round((c.kobo / grandTotal) * 100)
            return (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium truncate">{meta.label}</span>
                  <span className="tnum text-ink-muted shrink-0">
                    {formatNaira(c.kobo)}
                    <span className="ml-1 text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className={`h-full ${meta.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
