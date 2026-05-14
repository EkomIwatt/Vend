/**
 * Display helpers. Amounts always stored in kobo (integer); formatted at the edge.
 */

export function formatNaira(kobo: number | string | null | undefined, opts?: { withSymbol?: boolean }): string {
  if (kobo === null || kobo === undefined) return '—'
  const n = typeof kobo === 'string' ? parseInt(kobo, 10) : kobo
  if (Number.isNaN(n)) return '—'
  const naira = n / 100
  const formatted = naira.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return opts?.withSymbol === false ? formatted : `₦${formatted}`
}

export function nairaToKobo(naira: string | number): number {
  const n = typeof naira === 'string' ? parseFloat(naira) : naira
  if (Number.isNaN(n)) return 0
  return Math.round(n * 100)
}

export function formatAccountNumber(n: string | null | undefined): string {
  if (!n) return '—'
  // 6676146167 → 6676 1461 67
  return n.replace(/(\d{4})(\d{4})(\d+)/, '$1 $2 $3')
}

export function bankNameFromCode(code: string | null | undefined): string {
  const banks: Record<string, string> = {
    '058': 'GTBank',
    '044': 'Access Bank',
    '011': 'First Bank',
    '033': 'United Bank for Africa',
  }
  if (!code) return '—'
  return banks[code] ?? `Bank ${code}`
}
