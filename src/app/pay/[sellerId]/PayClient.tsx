'use client'

import { useState } from 'react'
import { formatNaira, nairaToKobo } from '@/lib/format'

type Props = {
  sellerId: string
  virtualAccountNumber: string
  businessName: string
}

export default function PayClient({ sellerId, virtualAccountNumber, businessName }: Props) {
  const [amount, setAmount] = useState('')
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(virtualAccountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API can fail; user can still read the number
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountKobo = nairaToKobo(amount)
    if (amountKobo <= 0) {
      setError('Enter an amount greater than zero')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId,
          amountKobo,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
          description: description.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Payment failed')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="border-t border-line mt-5 pt-5">
        <div className="bg-primary/5 border border-primary/30 rounded-lg p-4 text-center">
          <p className="font-semibold text-primary text-lg">Payment received</p>
          <p className="text-sm text-ink-muted mt-1">
            We&apos;ve sent your receipt to {payerEmail}.
          </p>
          <p className="text-xs text-ink-muted mt-3">
            You paid {formatNaira(nairaToKobo(amount))} to {businessName}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={copyAccountNumber}
        className="text-sm text-primary hover:underline mt-3 inline-flex items-center gap-1"
      >
        {copied ? '✓ Copied' : 'Copy account number'}
      </button>

      <div className="border-t border-line mt-5 pt-5">
        <p className="text-sm text-ink-muted mb-4">
          Pay any amount to test. We&apos;ll email a receipt to you within seconds.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium block mb-1">Amount (₦)</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              required
              className="w-full px-3 py-2.5 bg-white border border-line rounded-md tnum focus:outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium block mb-1">Your name</span>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium block mb-1">Email for receipt</span>
            <input
              type="email"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium block mb-1">
              What&apos;s this for? <span className="text-ink-muted font-normal">(optional)</span>
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="2 plates of jollof"
              className="w-full px-3 py-2.5 bg-white border border-line rounded-md focus:outline-none focus:border-primary"
            />
          </label>

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
            {submitting
              ? 'Processing payment…'
              : `Pay ${formatNaira(nairaToKobo(amount || '0'))} to ${businessName}`}
          </button>

          <p className="text-xs text-ink-muted text-center">
            Sandbox mode · No real money will move
          </p>
        </form>
      </div>
    </>
  )
}
