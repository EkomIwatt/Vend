import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from './_components/Sidebar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: seller } = await supabase
    .from('sellers')
    .select('business_name, tier, trust_score')
    .eq('user_id', user.id)
    .maybeSingle()

  // Signup creates the seller row atomically; if it's missing we treat the
  // account as half-built and bounce them back to finish setup.
  if (!seller) redirect('/signup')

  return (
    <div className="min-h-screen">
      <Sidebar seller={seller} />
      <div className="lg:pl-60">
        <main className="p-6 sm:p-10 max-w-5xl">{children}</main>
      </div>
    </div>
  )
}
