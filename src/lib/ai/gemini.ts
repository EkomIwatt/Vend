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
  firstName?: string
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

  const greetingName = (input.firstName?.trim() || input.businessName).split(/\s|'/)[0]

  const prompt = `Write a warm, encouraging 2–3 sentence weekly recap for a Nigerian campus micro-merchant. Tone: like a supportive friend or coach who's noticed their hustle. Lively but not cheesy. Specific, not generic.

RULES:
- Open with "Hi ${greetingName}," or "Hey ${greetingName},"
- Mention the actual total (with ₦ and commas, e.g. ₦47,000) and the number of payments
- Reference at least ONE concrete detail from the data: the busiest day, the dominant category, or the size of a standout payment
- End with a forward-looking line — encouragement, observation, or a light next step. Not pushy.
- 35–70 words total, 2–3 sentences
- No emojis. No exclamation marks beyond one. No "amazing/awesome/incredible" word salad — earn the energy with specifics.
- If total is small (₦5,000 or less) or count is 1: stay gentle and grounded, frame it as a beginning not a celebration.

GOOD EXAMPLES (match this register):
- Hi Tomi, your braids business is buzzing — ₦47,000 across 12 bookings this week, with Saturday alone bringing 4 clients. Weekend energy is clearly your sweet spot. Keep showing up.
- Hey Adaeze, a steady ₦12,500 from 3 food orders, mostly mid-week. Small but consistent — and your repeat customers are starting to show. The next jump usually comes from one good referral.
- Hi Tomi, one booking of ₦5,000 came in today, your first on Vend. Every payment after this one builds the trust score that unlocks higher limits. Share your link in a hostel group when you can.

DATA:
Business: ${input.businessName}
Owner name to use: ${greetingName}
Total this week: ₦${totalNaira}
Number of payments: ${count}
Busiest day: ${busiestDay ?? 'n/a'} (${busiestCount} payment${busiestCount === 1 ? '' : 's'})
Recent transactions:
${sample}

Write the recap now (no preamble, no quotes, just the recap text):`

  const raw = await callGemini(prompt, { maxOutputTokens: 200, temperature: 0.55 })
  if (!raw) return null

  // Strip surrounding quotes/code-fences and any leading "Output:" or "Here is" preamble
  const cleaned = raw
    .replace(/^["'`*\s]+|["'`*\s]+$/g, '')
    .replace(/^(Output|Recap|Sentence|Summary|Here(?:'s|\sis))\s*:?\s*/i, '')
    .trim()
  return cleaned
}
