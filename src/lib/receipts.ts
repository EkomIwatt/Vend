/**
 * Receipt helpers — verification codes + URL building.
 *
 * Codes are short, uppercase, and avoid visually ambiguous characters
 * (no 0/O, no 1/I/L). Per spec §6B: "Six characters is fine for a demo."
 * 26^6 ≈ 308M combinations — collision risk is negligible at demo volume,
 * and the unique constraint on receipts.verification_code catches any race.
 */

import { customAlphabet } from 'nanoid'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

const nano = customAlphabet(ALPHABET, CODE_LENGTH)

export function generateVerificationCode(): string {
  return nano()
}

export function buildVerifyUrl(code: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/verify/${code}`
}
