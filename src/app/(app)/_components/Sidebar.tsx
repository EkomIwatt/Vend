'use client'

import { useEffect, useState } from 'react'
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

const STORAGE_KEY = 'vend.sidebar.collapsed'

export default function Sidebar({ seller }: { seller: SellerSummary }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === '1') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside
      className={[
        'hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-30 bg-primary text-white transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      {collapsed ? (
        <div className="border-b border-white/10 px-3 py-5 flex flex-col items-center gap-3">
          <button
            onClick={toggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <IconChevron className="w-4 h-4" />
          </button>
          <Link
            href="/dashboard"
            className="font-serif text-2xl text-white tracking-tight"
            title="Vend"
          >
            V
          </Link>
        </div>
      ) : (
        <div className="border-b border-white/10 px-6 py-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="font-serif text-2xl text-white tracking-tight"
            >
              Vend
            </Link>
            <p className="text-xs text-white/60 mt-0.5">Financial OS · Beta</p>
          </div>
          <button
            onClick={toggle}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="p-1.5 -mr-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <IconChevron className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      <nav className={['flex-1 py-4 space-y-6 overflow-y-auto', collapsed ? 'px-2' : 'px-3'].join(' ')}>
        <Section collapsed={collapsed}>
          {NAV_ACTIVE.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
              collapsed={collapsed}
            />
          ))}
        </Section>

        <Section title="Coming in v2" collapsed={collapsed}>
          {NAV_V2.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              badge="v2"
              collapsed={collapsed}
            />
          ))}
        </Section>
      </nav>

      <div className={['border-t border-white/10', collapsed ? 'px-2 py-3' : 'px-4 py-4'].join(' ')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-wide bg-white text-primary px-1.5 py-0.5 rounded font-medium tnum"
              title={`${seller.business_name} · ${seller.tier}`}
            >
              {Number(seller.trust_score ?? 0).toFixed(1)}
            </span>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <IconSignOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/50 uppercase tracking-wide">Signed in as</p>
            <p className="font-medium text-sm mt-0.5 truncate text-white">{seller.business_name}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] uppercase tracking-wide bg-white/10 text-white px-1.5 py-0.5 rounded font-medium">
                {seller.tier}
              </span>
              <span className="text-[10px] uppercase tracking-wide bg-white text-primary px-1.5 py-0.5 rounded font-medium tnum">
                {Number(seller.trust_score ?? 0).toFixed(1)}
              </span>
            </div>
            <button
              onClick={signOut}
              className="mt-3 text-xs text-white/60 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function Section({
  title,
  children,
  collapsed,
}: {
  title?: string
  children: React.ReactNode
  collapsed: boolean
}) {
  return (
    <div>
      {title && !collapsed && (
        <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-white/40 font-medium">
          {title}
        </p>
      )}
      {title && collapsed && <div className="mx-2 mb-1.5 h-px bg-white/10" />}
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
  collapsed,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: string
  collapsed: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        title={collapsed ? (badge ? `${label} (${badge})` : label) : undefined}
        className={[
          'flex items-center rounded-md text-sm transition-colors',
          collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2',
          active
            ? 'bg-white text-primary font-medium'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        ].join(' ')}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {badge && (
              <span className="text-[9px] uppercase tracking-wider bg-white/15 text-white/70 px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </>
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

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
