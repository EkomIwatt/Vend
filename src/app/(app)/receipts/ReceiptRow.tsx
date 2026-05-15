'use client'

import { useState } from 'react'

type Props = {
  verificationCode: string
  verifyUrl: string
  amountFormatted: string
  paidAtIso: string
  payerName: string | null
  payerEmail: string | null
  description: string | null
  delivered: boolean
}

export default function ReceiptRow({
  verificationCode,
  verifyUrl,
  amountFormatted,
  paidAtIso,
  payerName,
  payerEmail,
  description,
  delivered,
}: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable; user can still right-click + copy */
    }
  }

  const paidAt = new Date(paidAtIso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  })

  return (
    <li className="p-5 sm:p-6 flex flex-wrap items-start gap-x-6 gap-y-3">
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-semibold tnum">{amountFormatted}</p>
          {delivered ? (
            <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              Emailed
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider bg-line text-ink-muted px-1.5 py-0.5 rounded font-medium">
              Code only
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted mt-1">
          {paidAt}
          {payerName ? ` · From ${payerName}` : ''}
          {payerEmail ? ` · ${payerEmail}` : ''}
        </p>
        {description && (
          <p className="text-xs text-ink-muted mt-0.5">For: {description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <code className="text-xs font-mono tracking-widest bg-surface border border-line px-2 py-1 rounded">
          {verificationCode}
        </code>
        <button
          onClick={copyLink}
          className="text-xs bg-white border border-line hover:border-primary text-ink px-2.5 py-1.5 rounded-md font-medium transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-primary hover:bg-primary-hover text-white px-2.5 py-1.5 rounded-md font-medium transition-colors"
        >
          Open ↗
        </a>
      </div>
    </li>
  )
}
