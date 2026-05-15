/**
 * Resend wrapper — sends the receipt email after a successful payment.
 *
 * Returns { ok, error? } so the webhook caller can decide whether to write
 * delivered_at on the receipt row. Never throws — email failure is logged
 * and reported, but the transaction itself is already saved.
 *
 * Env:
 *   RESEND_API_KEY     — from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL  — verified sender; for hackathon, "onboarding@resend.dev"
 *                        is fine but only delivers to the Resend account email.
 */

import { Resend } from 'resend'
import { formatNaira } from '@/lib/format'

type SendReceiptInput = {
  to: string
  sellerBusinessName: string
  amountKobo: number
  verifyUrl: string
  verificationCode: string
  transactionRef: string
  paidAt: Date
  description?: string | null
}

type SendResult = { ok: true } | { ok: false; error: string }

export async function sendReceiptEmail(input: SendReceiptInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    return { ok: false, error: 'RESEND_API_KEY or RESEND_FROM_EMAIL is not set' }
  }

  const resend = new Resend(apiKey)
  const amount = formatNaira(input.amountKobo)
  const paidAtStr = input.paidAt.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  })

  const subject = `Receipt for ${amount} to ${input.sellerBusinessName}`

  try {
    const { error } = await resend.emails.send({
      from: `${input.sellerBusinessName} via Vend <${from}>`,
      to: input.to,
      subject,
      html: renderHtml({ ...input, amountFormatted: amount, paidAtStr }),
      text: renderText({ ...input, amountFormatted: amount, paidAtStr }),
    })

    if (error) {
      return { ok: false, error: error.message ?? 'Resend returned an error' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown send error' }
  }
}

type RenderInput = SendReceiptInput & {
  amountFormatted: string
  paidAtStr: string
}

function renderHtml(i: RenderInput): string {
  const desc = i.description
    ? `<tr><td style="color:#6B6B6B;padding:6px 0;">For</td><td style="text-align:right;padding:6px 0;">${escape(i.description)}</td></tr>`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF7F2;font-family:Inter,system-ui,sans-serif;color:#0A0A0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border:1px solid #E8E4DD;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B6B;">Receipt</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#0A0A0A;">${escape(i.sellerBusinessName)}</h1>
            <p style="margin:24px 0 4px;font-size:13px;color:#6B6B6B;">Amount received</p>
            <p style="margin:0;font-size:36px;font-weight:600;color:#0F4C3A;font-feature-settings:'tnum';">${i.amountFormatted}</p>

            <table role="presentation" width="100%" style="margin-top:24px;font-size:14px;border-top:1px solid #E8E4DD;">
              ${desc}
              <tr><td style="color:#6B6B6B;padding:6px 0;">Paid on</td><td style="text-align:right;padding:6px 0;">${escape(i.paidAtStr)}</td></tr>
              <tr><td style="color:#6B6B6B;padding:6px 0;">Reference</td><td style="text-align:right;padding:6px 0;font-family:monospace;">${escape(i.transactionRef)}</td></tr>
              <tr><td style="color:#6B6B6B;padding:6px 0;">Verification code</td><td style="text-align:right;padding:6px 0;font-family:monospace;letter-spacing:2px;">${escape(i.verificationCode)}</td></tr>
            </table>

            <div style="margin-top:32px;text-align:center;">
              <a href="${escape(i.verifyUrl)}" style="display:inline-block;background:#0F4C3A;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">Verify this receipt</a>
              <p style="margin:12px 0 0;font-size:12px;color:#6B6B6B;word-break:break-all;">${escape(i.verifyUrl)}</p>
            </div>

            <p style="margin:32px 0 0;font-size:12px;color:#6B6B6B;text-align:center;">Powered by <strong style="color:#0F4C3A;">Vend</strong> · Receipts you can verify, anywhere.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function renderText(i: RenderInput): string {
  const lines = [
    `Receipt — ${i.sellerBusinessName}`,
    ``,
    `Amount: ${i.amountFormatted}`,
    i.description ? `For: ${i.description}` : null,
    `Paid: ${i.paidAtStr}`,
    `Reference: ${i.transactionRef}`,
    `Verification code: ${i.verificationCode}`,
    ``,
    `Verify this receipt: ${i.verifyUrl}`,
    ``,
    `Powered by Vend.`,
  ]
  return lines.filter(Boolean).join('\n')
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
