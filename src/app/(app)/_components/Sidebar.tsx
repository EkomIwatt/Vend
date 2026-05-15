'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase-browser'

type SellerSummary = {
  business_name: string
  tier: string
  trust_score: number | null
}

const NAV_ACTIVE = [
  { href: '/dashboard', label: 'Dashboard', icon: IconHome },
  { href: '/receipts', label: 'Receipts', icon: IconReceipt },
  { href: '/settings', label: 'Settings', icon: IconCog },
]

const NAV_V2 = [
  { href: '/marketplace', label: 'Marketplace', icon: IconStore },
  { href: '/collections', label: 'Collections', icon: IconUsers },
  { href: '/trust', label: 'Trust & Verification', icon: IconShield },
]

export default function Sidebar({ seller }: { seller: SellerSummary }) {
  const pathname = usePathname()

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-line bg-white">
      <div className="px-6 py-5 border-b border-line">
        <Link href="/dashboard" className="font-serif text-2xl text-primary tracking-tight">
          Vend
        </Link>
        <p className="text-xs text-ink-muted mt-0.5">Financial OS · Beta</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <Section>
          {NAV_ACTIVE.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </Section>

        <Section title="Coming in v2">
          {NAV_V2.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              badge="v2"
            />
          ))}
        </Section>
      </nav>

      <div className="px-4 py-4 border-t border-line">
        <p className="text-xs text-ink-muted uppercase tracking-wide">Signed in as</p>
        <p className="font-medium text-sm mt-0.5 truncate">{seller.business_name}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
            {seller.tier}
          </span>
          <span className="text-[10px] uppercase tracking-wide bg-primary text-white px-1.5 py-0.5 rounded font-medium tnum">
            {Number(seller.trust_score ?? 0).toFixed(1)}
          </span>
        </div>
        <button
          onClick={signOut}
          className="mt-3 text-xs text-ink-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-ink-muted font-medium">
          {title}
        </p>
      )}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: string
}) {
  return (
    <li>
      <Link
        href={href}
        className={[
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-ink-muted hover:bg-surface hover:text-ink',
        ].join(' ')}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className="text-[9px] uppercase tracking-wider bg-line text-ink-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </Link>
    </li>
  )
}

/* Inline SVG icons — stroked, consistent with Inter UI weight. */

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9.5z" />
    </svg>
  )
}

function IconReceipt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2H6z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  )
}

function IconCog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function IconStore({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5" />
      <path d="M3 9v11h18V9" />
      <path d="M9 20v-7h6v7" />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
