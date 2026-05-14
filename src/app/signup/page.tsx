'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type FormState = {
  // Auth
  email: string
  password: string

  // Display
  businessName: string
  businessDescription: string

  // Legal identity (for Squad / BVN)
  legalFirstName: string
  legalMiddleName: string
  legalLastName: string
  bvn: string
  dob: string  // yyyy-mm-dd from input, we convert to mm/dd/yyyy when sending
  gender: '1' | '2'
  phone: string
  address: string
}

const empty: FormState = {
  email: '',
  password: '',
  businessName: '',
  businessDescription: '',
  legalFirstName: '',
  legalMiddleName: '',
  legalLastName: '',
  bvn: '',
  dob: '',
  gender: '2',
  phone: '',
  address: '',
}

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // The API route handles auth user creation, Squad, seller row insert,
    // and sign-in atomically. If anything fails, it rolls back.
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await res.json()

    if (!res.ok) {
      setError(result.error ?? 'Signup failed')
      setSubmitting(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        <Link href="/" className="text-primary text-sm hover:underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Create your Vend account</h1>
        <p className="text-ink-muted mb-8">
          Tell us about your business. We&apos;ll set up your dedicated bank account in
          seconds.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="Login">
            <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
            <Field label="Password" type="password" value={form.password} onChange={(v) => set('password', v)} required hint="Minimum 6 characters" />
          </Section>

          <Section title="Your business">
            <Field
              label="Business name"
              value={form.businessName}
              onChange={(v) => set('businessName', v)}
              placeholder="Tomi's Braids"
              hint="What customers will see on your payment page and receipts."
              required
            />
            <Field
              label="What do you do?"
              value={form.businessDescription}
              onChange={(v) => set('businessDescription', v)}
              placeholder="I braid hair for students at UNILAG, mostly box braids and cornrows."
              hint="Describe your business in your own words."
              required
            />
          </Section>

          <Section
            title="Your legal identity"
            description="Required to set up your bank account. Customers will never see this."
          >
            <div className="grid grid-cols-3 gap-3">
              <Field label="First name" value={form.legalFirstName} onChange={(v) => set('legalFirstName', v)} required />
              <Field label="Middle name" value={form.legalMiddleName} onChange={(v) => set('legalMiddleName', v)} required />
              <Field label="Last name" value={form.legalLastName} onChange={(v) => set('legalLastName', v)} required />
            </div>
            <Field
              label="BVN"
              value={form.bvn}
              onChange={(v) => set('bvn', v.replace(/\D/g, '').slice(0, 11))}
              placeholder="11-digit BVN"
              hint="Dial *565*0# on your registered phone if you don't know it."
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Date of birth"
                type="date"
                value={form.dob}
                onChange={(v) => set('dob', v)}
                required
              />
              <label className="block">
                <span className="text-sm font-medium block mb-1.5">Gender</span>
                <select
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value as '1' | '2')}
                  className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
                >
                  <option value="2">Female</option>
                  <option value="1">Male</option>
                </select>
              </label>
            </div>
            <Field
              label="Phone number"
              value={form.phone}
              onChange={(v) => set('phone', v.replace(/\D/g, '').slice(0, 11))}
              placeholder="08012345678"
              required
            />
            <Field
              label="Address"
              value={form.address}
              onChange={(v) => set('address', v)}
              placeholder="12 Akoka Road, Yaba, Lagos"
              required
            />
          </Section>

          {error && (
            <div className="bg-danger/5 border border-danger/30 text-danger text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-md font-medium transition-colors"
          >
            {submitting ? 'Setting up your account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </h2>
        {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
      />
      {hint && <span className="text-xs text-ink-muted block mt-1">{hint}</span>}
    </label>
  )
}
