import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase-admin'
import { formatAccountNumber, bankNameFromCode } from '@/lib/format'
import PayClient from './PayClient'

export const dynamic = 'force-dynamic'

type Props = { params: { sellerId: string } }

export default async function PayPage({ params }: Props) {
  const admin = createAdminClient()
  const { data: seller } = await admin
    .from('sellers')
    .select(
      'id, business_name, business_description, squad_virtual_account_number, squad_bank_code, legal_first_name, legal_last_name, tier, trust_score',
    )
    .eq('id', params.sellerId)
    .maybeSingle()

  if (!seller || !seller.squad_virtual_account_number) {
    notFound()
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const payUrl = `${baseUrl}/pay/${seller.id}`
  const qrDataUrl = await QRCode.toDataURL(payUrl, {
    width: 360,
    margin: 1,
    color: { dark: '#0F4C3A', light: '#FAF7F2' },
  })

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            Pay with Vend
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-2 leading-tight">
            {seller.business_name}
          </h1>
          {seller.business_description && (
            <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
              {seller.business_description}
            </p>
          )}
          <div className="inline-flex items-center gap-2 mt-3 text-xs">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wide font-medium">
              {seller.tier}
            </span>
            <span className="text-ink-muted">
              Trust score · <span className="tnum">{Number(seller.trust_score ?? 0)}</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Dedicated bank account
          </p>
          <p className="text-3xl font-semibold tnum tracking-wide mt-1.5">
            {formatAccountNumber(seller.squad_virtual_account_number)}
          </p>
          <p className="text-sm text-ink-muted mt-1">
            {bankNameFromCode(seller.squad_bank_code)} ·{' '}
            <span className="uppercase">
              {seller.legal_first_name} {seller.legal_last_name}
            </span>
          </p>

          <PayClient
            sellerId={seller.id}
            virtualAccountNumber={seller.squad_virtual_account_number}
            businessName={seller.business_name}
          />
        </div>

        <details className="mt-6 bg-white border border-line rounded-lg">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium select-none">
            Or scan this QR code
          </summary>
          <div className="px-4 pb-4">
            <img src={qrDataUrl} alt="Payment QR" className="w-full h-auto rounded" />
            <p className="text-xs text-ink-muted mt-2 break-all">{payUrl}</p>
          </div>
        </details>

        <p className="text-center text-xs text-ink-muted mt-8">
          Powered by <span className="font-semibold text-primary">Vend</span> · Sandbox demo
        </p>
      </div>
    </main>
  )
}
