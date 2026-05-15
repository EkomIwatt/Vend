/**
 * Gemini wrapper — thin REST client around Google's Generative Language API.
 *
 * No SDK dependency: a single fetch per call keeps cold starts fast and the
 * surface area small. Returns null on any failure so AI degradation never
 * crashes the calling route — the demo still works without AI, just less
 * polished.
 *
 * Env: GEMINI_API_KEY (server-side, obtained from https://aistudio.google.com)
 */

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export const CATEGORIES = [
  'food',
  'drinks',
  'services',
  'retail',
  'personal_care',
  'education',
  'transport',
  'entertainment',
  'other',
] as const

export type Category = (typeof CATEGORIES)[number]

async function callGemini(
  prompt: string,
  opts?: { maxOutputTokens?: number; temperature?: number },
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.warn('[ai] GEMINI_API_KEY is not set — skipping AI call')
    return null
  }

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts?.temperature ?? 0.3,
          maxOutputTokens: opts?.maxOutputTokens ?? 120,
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn('[ai] Gemini HTTP', res.status, body.slice(0, 200))
      return null
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null
    return text.trim()
  } catch (err) {
    console.warn('[ai] Gemini call threw:', err)
    return null
  }
}

export async function categorizeTransaction(input: {
  businessDescription: string
  transactionDescription?: string | null
}): Promise<Category | null> {
  const prompt = `You are categorizing one payment for a Nigerian campus micro-merchant.

Business: "${input.businessDescription}"
Payment description (free-form from buyer or bank): "${input.transactionDescription ?? '(none)'}"

Choose ONE category from this list. Output the lowercase word only — no punctuation, no explanation.

Categories: ${CATEGORIES.join(', ')}

Category:`

  const raw = await callGemini(prompt, { maxOutputTokens: 20, temperature: 0.1 })
  if (!raw) return null

  const cleaned = raw.toLowerCase().trim().replace(/[^a-z_]/g, '')
  if ((CATEGORIES as readonly string[]).includes(cleaned)) {
    return cleaned as Category
  }
  // Model returned something unexpected — fall back to 'other' rather than null
  // so we don't keep retrying on every dashboard load.
  console.warn('[ai] categorize: unexpected output, defaulting to other:', raw)
  return 'other'
}

export async function summarizeWeek(input: {
  businessName: string
  transactions: Array<{
    amount_kobo: number
    description: string | null
    ai_category: string | null
    created_at: string
  }>
}): Promise<string | null> {
  if (input.transactions.length === 0) return null

  const totalKobo = input.transactions.reduce(
    (acc, t) => acc + Number(t.amount_kobo),
    0,
  )
  const totalNaira = (totalKobo / 100).toLocaleString('en-NG')
  const count = input.transactions.length

  // Day-of-week histogram for "busiest day"
  const dayCounts = new Map<string, number>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const t of input.transactions) {
    const d = new Date(t.created_at)
    const name = dayNames[d.getDay()]
    dayCounts.set(name, (dayCounts.get(name) ?? 0) + 1)
  }
  let busiestDay: string | null = null
  let busiestCount = 0
  for (const [day, c] of dayCounts.entries()) {
    if (c > busiestCount) {
      busiestDay = day
      busiestCount = c
    }
  }

  // Trim to last 30 transactions to keep prompt small.
  const sample = input.transactions
    .slice(0, 30)
    .map((t) => {
      const naira = (Number(t.amount_kobo) / 100).toLocaleString('en-NG')
      return `- ₦${naira} (${t.ai_category ?? 'uncategorized'}) ${t.created_at.slice(0, 10)}`
    })
    .join('\n')

  const prompt = `Write ONE short sentence (12-22 words) recapping a Nigerian micro-merchant's week. Plain, factual, friendly. Address the seller as "you". Use ₦ with commas (e.g. ₦47,000). No preamble. No quotes. No emojis. No "this week" filler — just state what happened.

If only 1 transaction: lead with the single amount and what they earned it on (category).
If 2+ transactions: lead with total + count, then mention the busiest day OR the dominant category.
If total < ₦1,000: keep it gentle — small numbers don't need celebration words.

Examples of good output (length, tone):
  - You earned ₦47,000 from 12 payments, with Saturday being your busiest day.
  - One payment of ₦5,000 landed today — looks like a hair-braiding job.
  - ₦12,500 across 3 payments, most of them on Friday.

Business: ${input.businessName}
Total: ₦${totalNaira}
Count: ${count}
Busiest day: ${busiestDay ?? 'n/a'} (${busiestCount} payment${busiestCount === 1 ? '' : 's'})
Recent transactions:
${sample}

Output exactly one sentence and nothing else:`

  const raw = await callGemini(prompt, { maxOutputTokens: 60, temperature: 0.3 })
  if (!raw) return null

  // Strip surrounding quotes/code-fences and any leading "Output:" or "Here is" preamble
  let cleaned = raw
    .replace(/^["'`*\s]+|["'`*\s]+$/g, '')
    .replace(/^(Output|Sentence|Summary|Here(?:'s|\sis))\s*:?\s*/i, '')
    .trim()

  // Take only first sentence if the model emitted multiple
  const firstSentenceEnd = cleaned.search(/[.!?](\s|$)/)
  if (firstSentenceEnd !== -1) {
    cleaned = cleaned.slice(0, firstSentenceEnd + 1)
  }
  return cleaned
}
