import { formatNaira } from '@/lib/format'

type Txn = {
  amount_kobo: number | string
  created_at: string
}

/**
 * 7-day inflow bar chart. Server component, SVG-only (no chart library) so
 * the page stays light. Bars are sized relative to the busiest day in the
 * window so a quiet week still reads as a visible bar at the bottom.
 */
export default function WeeklyChart({ transactions }: { transactions: Txn[] }) {
  const days = buildLast7Days(transactions)
  const max = Math.max(1, ...days.map((d) => d.totalKobo))
  const total = days.reduce((acc, d) => acc + d.totalKobo, 0)

  return (
    <div className="bg-white border border-line rounded-lg p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="font-semibold">Last 7 days</h2>
          <p className="text-xs text-ink-muted mt-0.5 tnum">
            {formatNaira(total)} total · {days.reduce((a, d) => a + d.count, 0)} payments
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-ink-muted">
          Inflow
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 h-32">
        {days.map((d) => {
          const heightPct = max === 0 ? 0 : Math.max(4, Math.round((d.totalKobo / max) * 100))
          return (
            <div key={d.iso} className="flex flex-col justify-end items-center">
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className="w-full bg-primary rounded-t-sm"
                  style={{ height: `${heightPct}%` }}
                  title={`${d.label}: ${formatNaira(d.totalKobo)} (${d.count} payment${d.count === 1 ? '' : 's'})`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-1.5">
        {days.map((d) => (
          <div key={d.iso} className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              {d.shortLabel}
            </p>
            <p className="text-[11px] tnum mt-0.5">
              {d.totalKobo > 0 ? formatNaira(d.totalKobo) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildLast7Days(txns: Txn[]) {
  // Compute each of the last 7 days as midnight-anchored Africa/Lagos buckets.
  // We work entirely in UTC for arithmetic and only format for display, so
  // edge-of-day boundaries are still close-enough for a 7-day view.
  const now = new Date()
  const buckets: { iso: string; date: Date }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    d.setUTCHours(0, 0, 0, 0)
    buckets.push({ iso: d.toISOString(), date: d })
  }

  return buckets.map((b, idx) => {
    const dayTxns = txns.filter((t) => sameUTCDay(new Date(t.created_at), b.date))
    const totalKobo = dayTxns.reduce((acc, t) => acc + Number(t.amount_kobo), 0)
    return {
      iso: b.iso,
      label: b.date.toLocaleDateString('en-NG', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'Africa/Lagos',
      }),
      shortLabel:
        idx === 6
          ? 'Today'
          : b.date.toLocaleDateString('en-NG', {
              weekday: 'short',
              timeZone: 'Africa/Lagos',
            }),
      totalKobo,
      count: dayTxns.length,
    }
  })
}

function sameUTCDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}
