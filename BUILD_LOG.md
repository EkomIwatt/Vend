# Vend Hackathon — Build Log

Phase-by-phase reference for the May 14-16 sprint. Paired with `vend_hackathon_spec.md` (scope) and `MEMORY.md` (durable context for future sessions).

**Deadline:** EOD 2026-05-16
**Demo format:** Live to judges
**Strategy:** Build the full seven-step demo loop end-to-end. Polish + pitch deck after. Checkpoint after each phase.

---

## Overall plan

| Phase | Scope | Status |
|---|---|---|
| Pre — Phase 1 + 2A | Squad sandbox + Next.js scaffold + Supabase + signup → VA → dashboard skeleton | ✅ Done (May 8–12) |
| 1 | Payment surface (`/pay/[sellerId]`, dashboard share card, simulate-payment trigger) | ✅ Done (May 15) |
| 2 | Webhook handler + Vercel deploy + register webhook URL with Squad | ✅ Done (May 15) |
| 3 | Dashboard transactions list + total inflow + Claude categorize + Claude weekly summary | ⏳ Pending |
| 4 | Receipt generation + Resend email + public `/verify/[code]` page | ⏳ Pending |
| 5 | Polish (trust score badge, visual consistency, README, final smoke test) | ⏳ Pending |
| 6 | Pitch deck (10 slides per spec §11), one-pager PDF, demo rehearsal ×3 | ⏳ Pending |

---

## Pre-sprint baseline (May 8 – May 12)

**Phase 1 of the original spec — Squad sandbox API exploration.**

- Squad sandbox account live, docs read end-to-end
- First virtual account created from script (`vend-sandbox/scripts/create-virtual-account.ts`) — `6676146167`, GTBank (bank code `058`)
- Discovered: sandbox doesn't validate BVN content; `beneficiary_account` is required despite docs saying optional (`0000000000` works as dummy); email must be a real format
- Webhook signature contract confirmed: HMAC-SHA512 v3 over 6 piped fields

**Phase 2A of the original spec — Next.js + Supabase scaffold.**

- Next.js 14 App Router + TypeScript + Tailwind in `vend-app/`
- Tailwind tokens per spec §10 (primary `#0F4C3A`, surface `#FAF7F2`, ink, line, etc.)
- Supabase wired (`@supabase/ssr`), `sellers`/`transactions`/`receipts` tables created with RLS
- `PaymentProvider` interface + Squad implementation of `createVirtualAccount` only
- Home → signup → dashboard flow: auth user create → Squad VA → seller row insert → auto sign-in (with rollback on failure)
- Dashboard shows the seller's virtual account number, bank, legal name

---

## Phase 1 — Payment surface page ✅ (completed 2026-05-15)

**Goal:** Step 3 of the demo loop — seller sees a shareable payment link + QR; buyer opens the link and pays.

### New files

| Path | Purpose |
|---|---|
| `src/app/pay/[sellerId]/page.tsx` | Public buyer-facing page (server component, admin-client fetch to bypass seller RLS) |
| `src/app/pay/[sellerId]/PayClient.tsx` | Form (amount, name, email, optional description) → calls simulate-payment → success state |
| `src/app/pay/[sellerId]/not-found.tsx` | 404 for invalid seller ids |
| `src/app/api/simulate-payment/route.ts` | Stages payer info in `pending_payments` then calls Squad sandbox simulate |
| `src/app/dashboard/ShareCard.tsx` | Dashboard widget: payment link + QR + copy/share/open-in-tab |
| `src/lib/supabase-admin.ts` | Extracted service-role client factory |
| `src/lib/format.ts` | `formatNaira`, `nairaToKobo`, `formatAccountNumber`, `bankNameFromCode` |
| `supabase/02_pending_payments.sql` | Delta migration: bridges buyer-entered info with the inbound webhook |

### Modified files

| Path | Change |
|---|---|
| `src/lib/payments/types.ts` | `verifyWebhook`, `parseWebhook`, `simulatePayment` now required, not optional |
| `src/lib/payments/squad.ts` | Implemented `simulatePayment`, `verifyWebhook` (HMAC-SHA512 v3), `parseWebhook` |
| `src/app/dashboard/page.tsx` | Added the share card with QR + payment link |
| `src/app/api/signup/route.ts` | Switched to the shared `createAdminClient()` helper |
| `src/lib/supabase-server.ts` | Fixed pre-existing implicit-any on `setAll` callback that broke `next build` |
| `src/middleware.ts` | Same fix |
| `package.json` | Added `qrcode`, `nanoid`, `@anthropic-ai/sdk`, `resend`, `@types/qrcode` |
| `env.example` + `.env.local` | Added `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

### Design decision: pending_payments

Squad's `simulate-payment` only accepts `{ virtual_account_number, amount }` — no payer metadata pass-through. To make the demo loop carry a payer name + email all the way through to a receipt email, we stage that info in a `pending_payments` row when the buyer submits the form, then the webhook handler (Phase 2) looks up the most recent unmatched row for `(seller_id, amount_kobo)` and copies payer info onto the transaction. Rows expire after 15 min.

In production, real bank transfers carry payer name in the webhook payload from the bank's metadata, so this table becomes a fallback rather than the only source of payer info.

### Deferred to Phase 2+

- Webhook handler doesn't exist yet — Squad will retry the simulated webhook and eventually give up. The `pending_payments` row will sit unmatched until Phase 2.
- No actual transactions appear in the dashboard yet (Phase 3).
- No receipt email (Phase 4).

### Checkpoint result

`npm run build` passes cleanly. Routes:
- `/pay/[sellerId]` dynamic
- `/api/simulate-payment` dynamic
- `/dashboard` dynamic
- `/api/signup` dynamic
- `/`, `/login`, `/signup` static

User to verify manually: dashboard share card renders with QR, `/pay/[sellerId]` renders the buyer form, submitting the form completes with "Payment received" state.

### Notes for future me

- OneDrive + Next.js: must `rm -rf .next` before `next build` or hits EINVAL readlink on the symlink cleanup step. Captured in memory as `feedback-onedrive-next-cache`.
- `next dev` skips strict TypeScript; `next build` enforces it. Always build at least once per phase to surface dormant type errors before Vercel does.

---

## Phase 2 — Webhook handler + Vercel deploy ✅ (completed 2026-05-15)

**Goal:** Steps 4–5 of the demo loop. Inbound payment → transaction row in DB within seconds.

### Progress

- [x] `POST /api/webhooks/squad` implemented: raw-body read → HMAC-SHA512 v3 verify → parse → seller lookup by `customer_identifier` → idempotency check → `pending_payments` match → transaction insert with copied payer info → mark pending matched
- [x] `runtime = 'nodejs'` set on the route (avoid Edge — we need `crypto`)
- [x] Webhook accepts both `x-squad-encrypted-body` (v3) and `x-squad-signature` (legacy) header names
- [x] Idempotency: explicit `squad_transaction_ref` existence check + unique-constraint catch-all (code 23505 ⇒ silent 200)
- [x] Unrecognized `customer_identifier` is acked with 200 (orphan VAs from rolled-back signups don't cause Squad to retry forever)
- [x] `git init` in `vend-app/` (single project, not the workspace root)
- [x] `.gitignore` extended to ignore `.vercel/`
- [x] GitHub repo `EkomIwatt/Vend` created, initial commit pushed
- [x] Vercel project deployed: https://vend-plum.vercel.app (production)
- [x] Webhook URL registered in Squad sandbox: `https://vend-plum.vercel.app/api/webhooks/squad`
- [x] Smoke test PASSED — signature verifies, seller resolves via VA fallback, transaction lands with payer info merged from pending_payments

### Files

| Path | Purpose |
|---|---|
| `src/app/api/webhooks/squad/route.ts` | Webhook receiver: verify, parse, resolve seller, idempotent insert, match pending |

### Design notes

**Why pending_payments lookup happens after signature verify and before the row insert:** We want signature verification first (no DB work for unauthenticated callers). The pending_payments query is cheap and uses the partial index on `(seller_id, amount_kobo, created_at desc) WHERE matched_transaction_id IS NULL`. If no pending row exists (e.g. real bank transfer in production), the insert still proceeds with whatever payer info Squad's payload carried.

**Why we always 200 on signed-but-unprocessable payloads:** Squad retries non-2xx responses. For events we can't handle (unknown customer_identifier, failed payment events, malformed bodies after signature passed), retrying won't fix anything. Returning 200 stops the retry storm.

**Header naming:** Squad's docs disagree across pages on whether the signature header is `x-squad-encrypted-body` or `x-squad-signature`. The route accepts either. Once we observe a real webhook in production, we can narrow this.

### Live-fire fixes (real Squad sandbox webhook, May 15)

When the first end-to-end test fired, three issues surfaced that the spec hadn't predicted:

1. **Signature algorithm.** Spec's "6 piped fields" formula was wrong. Real algorithm per Squad's docs is `HMAC-SHA512(JSON.stringify(<parsed body>))` with **uppercase** hex output. Fixed in commit `ee7aa04`.

2. **Event field is often absent.** Squad's virtual-account inbound webhooks frequently have no `Event` / `transaction_status` field — they're sent only when a payment lands, so absence of a failure marker means success. `parseWebhook` now infers success from "transaction_reference + non-zero amount + no failure signal". Fixed in commit `73f0cf4`.

3. **customer_identifier mismatch.** The existing VA `6676146167` was created from the May 8 sandbox script with identifier `vend_test_1778245081234`, but the demo seller fixture used `vend_demo_seed_va6676146167`. Lookup by `customer_identifier` returned no seller. Fallback lookup by `virtual_account_number` saved us. Worth keeping in production — it's a more robust resolver. Fixed in commit `7db7e2d`.

**Observed Squad webhook body (top-level keys for VA inbound):**
```
transaction_reference, virtual_account_number, principal_amount, settled_amount,
fee_charged, transaction_date, customer_identifier, transaction_indicator,
remarks, currency, channel, sender_name, meta, encrypted_body
```

No `Event` or `transaction_status`. `remarks` carries Squad's auto-generated description (`"Transfer from <legal_name> to sandbox | [<customer_identifier>]"`). `sender_name` is the payer's bank-side name. We currently read `payer_name` from the pending_payments match instead (the buyer typed it on the /pay form), which is more accurate for the demo.

### Squad sandbox merchant rate limit

Hit "Merchant has reached account opening limit, please contact habaripay support" mid-build. Existing VAs remain usable. Workaround applied: seeded one demo seller (`6882d4a2-846b-40e2-9e56-f805fe0eb23a` / Tomi's Braids) directly via Supabase admin API, pinning it to the May 8 VA. Support ping sent in parallel — if HabariPay lifts the cap before the demo, live signup flow becomes demoable again.

---

## Phase 3 — Dashboard transactions + Claude AI ⏳

To be filled in.

---

## Phase 4 — Receipt email + public verify page ⏳

To be filled in.

---

## Phase 5 — Polish + final deploy ⏳

To be filled in.

---

## Phase 6 — Pitch deck + rehearsal ⏳

To be filled in.

---

## Glossary

- **Seller** — Vend user (the merchant). Has a virtual account, a business name (customer-facing), and a legal identity (BVN-matched).
- **Buyer / payer** — anonymous party paying via the `/pay/[sellerId]` link.
- **Customer identifier** — Vend-generated unique ID (`vend_<userId>`) sent to Squad on virtual account creation, echoed back on every webhook so we can resolve transactions to sellers.
- **Verified tier** — only tier active in the demo. BVN-confirmed. (Informal tier from master context can't be built on Squad's virtual-account product.)
- **HMAC-SHA512 v3** — Squad's webhook signature scheme. Hash input is `${transaction_reference}|${virtual_account_number}|${currency}|${principal_amount}|${settled_amount}|${customer_identifier}`, key is the Squad secret key.
- **Kobo** — 1/100 of a naira. All amounts stored as `bigint` kobo; formatted to naira only at display.
