/**
 * Trust score breakdown. Shows the composite score with the underlying
 * signals it's derived from. Per master context §3 "Trust score should be
 * interpretable, not a black box." The values shown here are the static
 * v1 narrative — the full computational pipeline ships with the
 * Trust & Verification surface in v2.
 */

type Props = {
  score: number
  daysOnPlatform: number
  transactionCount: number
}

type Signal = {
  label: string
  status: 'strong' | 'building' | 'pending' | 'clean'
  detail: string
}

export default function TrustBreakdown({
  score,
  daysOnPlatform,
  transactionCount,
}: Props) {
  const signals: Signal[] = [
    {
      label: 'Payment regularity',
      status: transactionCount >= 5 ? 'strong' : 'building',
      detail:
        transactionCount >= 5
          ? `${transactionCount} payments received`
          : `${transactionCount} payment${transactionCount === 1 ? '' : 's'} so far`,
    },
    {
      label: 'Time on Vend',
      status: daysOnPlatform >= 30 ? 'strong' : 'building',
      detail:
        daysOnPlatform >= 30
          ? `${daysOnPlatform} days`
          : `${daysOnPlatform} day${daysOnPlatform === 1 ? '' : 's'} — boost at 30`,
    },
    {
      label: 'Dispute record',
      status: 'clean',
      detail: 'No disputes',
    },
    {
      label: 'Customer reviews',
      status: 'pending',
      detail: 'Reviews unlock with Marketplace · v2',
    },
  ]

  return (
    <div className="bg-white border border-line rounded-lg p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Trust score</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Earned, interpretable, anti-gameable
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-3xl text-primary tnum leading-none">
            {score.toFixed(1)}
            <span className="text-base text-ink-muted">/10</span>
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {signals.map((s) => (
          <li key={s.label} className="flex items-start gap-3 text-sm">
            <StatusDot status={s.status} />
            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
              <span className="font-medium">{s.label}</span>
              <span className="text-ink-muted text-xs text-right">{s.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-ink-muted mt-5 leading-relaxed">
        Composite of weighted signals. Full breakdown ships with Trust &
        Verification — see the sidebar for what&apos;s coming.
      </p>
    </div>
  )
}

function StatusDot({ status }: { status: Signal['status'] }) {
  const tone =
    status === 'strong' || status === 'clean'
      ? 'bg-primary'
      : status === 'building'
      ? 'bg-warn'
      : 'bg-line'
  return <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${tone}`} />
}
