# Vend

**A financial operating system for Nigeria's campus micro-merchants.**

Built for Squad Hackathon 3.0, Challenge 02 ("Smart Systems: The Intelligent Economy"). The full submission is a working demo of Vend's seven-step founding loop: signup → BVN-verified virtual account → shareable payment link → buyer pays → webhook lands → dashboard updates with AI-categorized transactions and a weekly summary → verifiable receipt emailed to the buyer.

**Live demo:** <https://vend-plum.vercel.app>

---

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database + Auth:** Supabase (Postgres + Auth)
- **Payments:** Squad sandbox REST API, wrapped behind a `PaymentProvider` interface
- **AI:** Google Gemini (`gemini-2.5-flash-lite`) — categorization + weekly summary
- **Email:** Resend — receipt delivery
- **Hosting:** Vercel

Single Next.js project. No separate services.

## Architecture at a glance

```
┌─────────────┐  signup w/ BVN  ┌──────────────┐
│  Seller     │ ───────────────▶│ /api/signup  │ ──▶ Squad: create virtual account
└─────────────┘                 └──────────────┘     └──▶ Supabase: sellers row
        │
        │ shares /pay/[sellerId] link + QR
        ▼
┌─────────────┐  enters amount  ┌────────────────────────┐
│  Buyer      │ ───────────────▶│ /api/simulate-payment  │ ──▶ Squad sandbox simulate
└─────────────┘                 └────────────────────────┘
        │                                                       │
        │                                                       ▼
        │                                          ┌────────────────────────┐
        │                                          │ /api/webhooks/squad    │
        │                                          │  · HMAC-SHA512 verify  │
        │                                          │  · seller lookup       │
        │                                          │  · transaction insert  │
        │                                          │  · Gemini categorize   │
        │                                          │  · receipt + email     │
        │                                          └────────────────────────┘
        │                                                       │
        ▼                                                       ▼
┌─────────────┐  open verify link              ┌─────────────┐  view dashboard
│ /verify/    │ ◀──── email (Resend) ───       │ /dashboard  │
│  [code]     │                                │             │
└─────────────┘                                └─────────────┘
```

Paths:
- `src/lib/payments/` — `PaymentProvider` interface + Squad implementation
- `src/lib/ai/` — Gemini client (categorize + weekly summary) + summary cache
- `src/lib/email/resend.ts` — receipt email sender
- `src/lib/receipts.ts` — verification code generator + URL builder
- `src/app/api/webhooks/squad/route.ts` — the spine of the demo

---

## Setup

### Prerequisites

You'll need free accounts on:
- [Supabase](https://supabase.com) (Postgres + Auth)
- [Squad Sandbox](https://sandbox.squadco.com) (virtual accounts + webhooks)
- [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini API key)
- [Resend](https://resend.com/api-keys) (transactional email)

### 1. Install

```bash
git clone https://github.com/EkomIwatt/Vend.git
cd Vend/vend-app
npm install
```

### 2. Environment variables

Copy the template:

```bash
cp env.example .env.local
```

Fill in:

| Key | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, under "Project API keys" | **Server only.** Bypasses RLS. Never expose. |
| `SQUAD_SECRET_KEY` | Squad sandbox → Merchant Settings → API & Webhook | `sandbox_sk_...` |
| `SQUAD_BASE_URL` | — | `https://sandbox-api-d.squadco.com` |
| `NEXT_PUBLIC_APP_URL` | — | `http://localhost:3000` locally; the production URL on Vercel |
| `GEMINI_API_KEY` | Google AI Studio → Get API key | Free tier covers demo traffic |
| `RESEND_API_KEY` | Resend dashboard → API Keys | Full-access scope is fine |
| `RESEND_FROM_EMAIL` | — | `onboarding@resend.dev` (free, but only delivers to the email registered on the Resend account). Or use any address on a Resend-verified domain. |

### 3. Database schema

In the Supabase dashboard → SQL Editor → New query, run the SQL files in this order:

1. `supabase/schema.sql` — creates `sellers`, `transactions`, `receipts`, sets RLS
2. `supabase/02_pending_payments.sql` — staging table for buyer-typed info between `/pay` and the webhook
3. `supabase/03_seller_summaries.sql` — cache table for the AI weekly summary

Each file is safe to re-run.

### 4. Disable email confirmation (demo only)

Supabase dashboard → Authentication → Providers → Email → toggle **Confirm email** OFF.

Re-enable for production.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Webhook setup (required for the demo loop)

Squad fires webhooks to a public URL, so to see transactions land you need a publicly reachable endpoint:

1. Deploy to Vercel (or any host).
2. Add the same env vars above to your Vercel project (Settings → Environment Variables).
3. Squad sandbox → Merchant Settings → API & Webhook → set Webhook URL to `https://<your-app>.vercel.app/api/webhooks/squad`.
4. Trigger a payment via `/pay/[sellerId]` → form submit → within ~5 seconds the transaction appears on the dashboard, an email lands, and the verify link works.

The webhook handler verifies Squad's HMAC-SHA512 signature (uppercase hex of the parsed body) before doing any work. Unsigned/invalid payloads are rejected with `400`.

## Notes for judges

- **Squad is the spine, not a logo.** Virtual accounts are created on signup, payments flow through `/virtual-account/simulate/payment` in sandbox, webhooks drive the dashboard in real time. See `src/app/api/webhooks/squad/route.ts`.
- **AI is wired, not decorative.** Every transaction is categorized by Gemini against the seller's "what do you do" text. The dashboard banner is a Gemini-generated 2-3 sentence summary of the week, cached and refreshed only when the underlying state changes.
- **Receipts are verifiable.** Each transaction yields a `/verify/[code]` page that exposes the seller's business name + amount paid, but never BVN, legal name, or payer email.
- **Tier story.** Every seller onboards as `verified` — BVN match is mandatory for Squad's `/virtual-account` (Customer model). The Informal tier is documented in the schema but is a future state requiring a different rail.

## Limitations / known gaps

- **BVN is not encrypted at rest.** Supabase Free doesn't ship column-level encryption; this is documented as a v2 hardening task. Sandbox BVNs are not real.
- **Sandbox `simulate-payment` only takes amount + VA.** Buyer-typed name/email/description are staged in `pending_payments` and merged in by the webhook handler. In production, bank transfers carry payer info in the webhook payload — `pending_payments` becomes a fallback rather than the primary source.
- **Receipt email sender uses Resend's onboarding domain in the demo.** Delivery is limited to the email on the Resend account. Swapping to a real domain is one env-var change.
- **Trust score is static for the demo.** The schema supports it, the UI surfaces it, but the signal pipeline (payment regularity, dispute rate, customer reviews, time on platform) is documented in the pitch deck as the post-MVP unlock.

## Project structure

```
vend-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Home
│   │   ├── signup/, login/                # Auth
│   │   ├── dashboard/page.tsx             # Seller view
│   │   ├── pay/[sellerId]/                # Public buyer-facing payment page
│   │   ├── verify/[code]/                 # Public receipt verification
│   │   └── api/
│   │       ├── signup/                    # Auth + Squad VA creation
│   │       ├── simulate-payment/          # Sandbox-only trigger
│   │       └── webhooks/squad/            # The spine
│   ├── lib/
│   │   ├── payments/                      # PaymentProvider interface + Squad impl
│   │   ├── ai/                            # Gemini wrapper + summary cache
│   │   ├── email/resend.ts                # Receipt email sender
│   │   ├── receipts.ts                    # Verification code generator
│   │   ├── format.ts                      # Naira / account / bank formatters
│   │   └── supabase-*.ts                  # Browser, server, admin clients
│   └── middleware.ts                      # Supabase auth session refresh
├── supabase/                              # SQL migrations
├── vend_hackathon_spec.md                 # The build spec
└── BUILD_LOG.md                           # Phase-by-phase log
```

## License

This codebase is the hackathon submission for Vend. Not licensed for redistribution.
