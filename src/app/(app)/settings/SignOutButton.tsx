'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="mt-4 text-sm bg-white border border-line hover:border-primary text-ink px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
