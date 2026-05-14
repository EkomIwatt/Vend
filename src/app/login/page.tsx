'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link href="/" className="text-primary text-sm hover:underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Welcome back</h1>
        <p className="text-ink-muted mb-8">Log in to your Vend account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-md font-medium transition-colors"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6 text-center">
          New to Vend?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
      />
    </label>
  )
}
