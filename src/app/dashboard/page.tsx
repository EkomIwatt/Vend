import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase-server'
import { formatAccountNumber, bankNameFromCode } from '@/lib/format'
import ShareCard from './ShareCard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!seller) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold">Account setup incomplete</h1>
          <p className="text-ink-muted mt-2">
            We couldn&apos;t find your seller profile. Please complete signup.
          </p>
        </div>
      </main>
    )
  }

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
    <main className="min-h-screen p-6 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-ink-muted">Vend</p>
            <h1 className="font-serif text-3xl tracking-tight mt-1">
              {seller.business_name}
            </h1>
          </div>
          <span className="text-xs uppercase tracking-wide bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">
            {seller.tier}
          </span>
        </header>

        <div className="bg-white border border-line rounded-lg p-6">
          <p className="text-sm text-ink-muted mb-1">Your dedicated account</p>
          <p className="text-3xl font-semibold tnum tracking-wide">
            {formatAccountNumber(seller.squad_virtual_account_number)}
          </p>
          <p className="text-sm text-ink-muted mt-2">
            {bankNameFromCode(seller.squad_bank_code)}
            {' · '}
            <span className="uppercase">{seller.legal_first_name} {seller.legal_last_name}</span>
          </p>

          <div className="border-t border-line mt-5 pt-5 text-sm text-ink-muted">
            Anyone can pay this account from any Nigerian bank app. The money lands
            in your Vend dashboard, not in your personal account.
          </div>
        </div>

        <ShareCard payUrl={payUrl} qrDataUrl={qrDataUrl} businessName={seller.business_name} />

        <div className="bg-white border border-line rounded-lg p-6">
          <h2 className="font-semibold mb-3">Recent transactions</h2>
          <p className="text-sm text-ink-muted">
            No transactions yet. When customers pay your account, they&apos;ll appear here.
          </p>
        </div>

        <p className="text-xs text-ink-muted text-center pt-4">
          Vend is in sandbox mode. No real money will be sent or received.
        </p>
      </div>
    </main>
  )
}
