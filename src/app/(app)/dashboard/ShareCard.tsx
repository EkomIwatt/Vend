'use client'

import { useState } from 'react'

type Props = {
  payUrl: string
  qrDataUrl: string
  businessName: string
}

export default function ShareCard({ payUrl, qrDataUrl, businessName }: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(payUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can fail in some browsers; user can still see the URL.
    }
  }

  async function shareLink() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Pay ${businessName}`,
          text: `Pay ${businessName} on Vend`,
          url: payUrl,
        })
        setShared(true)
        setTimeout(() => setShared(false), 1500)
        return
      } catch {
        // Fall through to copy
      }
    }
    copyLink()
  }

  return (
    <div className="bg-white border border-line rounded-lg p-6">
      <h2 className="font-semibold mb-1">Your payment page</h2>
      <p className="text-sm text-ink-muted mb-5">
        Share this link or QR code. Customers can pay you without leaving WhatsApp.
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="bg-surface border border-line rounded-lg p-3 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Payment QR code" className="w-40 h-40 block" />
        </div>

        <div className="flex-1 w-full space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Payment link</p>
            <p className="text-sm break-all mt-1 font-mono">{payUrl}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={copyLink}
              className="text-sm bg-white border border-line hover:border-primary text-ink px-3 py-2 rounded-md font-medium transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
            <button
              onClick={shareLink}
              className="text-sm bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-md font-medium transition-colors"
            >
              {shared ? '✓ Shared' : 'Share'}
            </button>
            <a
              href={payUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm bg-white border border-line hover:border-primary text-ink px-3 py-2 rounded-md font-medium transition-colors"
            >
              Open in new tab ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
