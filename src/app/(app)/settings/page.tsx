import { createClient } from '@/lib/supabase-server'
import { formatAccountNumber, bankNameFromCode } from '@/lib/format'
import SignOutButton from './SignOutButton'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: seller } = await supabase
    .from('sellers')
    .select('business_name, email, phone, tier, trust_score, squad_virtual_account_number, squad_bank_code, legal_first_name, legal_last_name, created_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!seller) return null

  const joined = new Date(seller.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-ink-muted">Settings</p>
        <h1 className="font-serif text-3xl tracking-tight mt-1.5">Account</h1>
      </header>

      <section className="bg-white border border-line rounded-lg divide-y divide-line">
        <Row label="Business name" value={seller.business_name} />
        <Row
          label="Legal name"
          value={`${seller.legal_first_name} ${seller.legal_last_name}`}
          hint="As verified with BVN. Customers never see this."
        />
        <Row label="Email" value={seller.email} />
        <Row label="Phone" value={seller.phone} />
        <Row
          label="Dedicated account"
          value={
            <span className="tnum">
              {formatAccountNumber(seller.squad_virtual_account_number)}
              <span className="text-ink-muted ml-2 normal-case font-normal">
                {bankNameFromCode(seller.squad_bank_code)}
              </span>
            </span>
          }
        />
        <Row label="Tier" value={String(seller.tier).toUpperCase()} />
        <Row
          label="Trust score"
          value={
            <span className="tnum">
              {Number(seller.trust_score ?? 0).toFixed(1)}
              <span className="text-ink-muted ml-1">/10</span>
            </span>
          }
        />
        <Row label="Joined Vend" value={joined} />
      </section>

      <section className="bg-white border border-line rounded-lg p-6">
        <h2 className="font-semibold">Sign out</h2>
        <p className="text-sm text-ink-muted mt-1">
          You can sign back in any time at <span className="font-mono">/login</span>.
        </p>
        <SignOutButton />
      </section>

      <p className="text-xs text-ink-muted">
        Editing profile fields, password changes, and team access ship in v2.
        Email{' '}
        <a href="mailto:hello@vend.ng" className="text-primary underline">
          hello@vend.ng
        </a>{' '}
        to update anything sooner.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="px-5 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
        {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
      </div>
      <div className="text-sm font-medium text-right break-all">{value}</div>
    </div>
  )
}
