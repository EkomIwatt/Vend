# Vend — Hackathon App (Phase 2A)

Next.js + Supabase + Squad. End of Phase 2A: seller signs up, gets a Squad virtual account, sees it on a dashboard.

## Setup

### 1. Install dependencies

```bash
cd vend-app
npm install
```

### 2. Set up environment variables

```bash
copy .env.example .env.local
```

Open `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page, anon/public key
- `SQUAD_SECRET_KEY` — from Squad Sandbox → Merchant Settings → API & Webhook (the `sandbox_sk_...` one)

### 3. Run the database migration

Open Supabase Dashboard → SQL Editor → New query.

Copy the contents of `supabase/schema.sql` and paste into the editor. Click Run.

You should see "Success. No rows returned." Three tables now exist: `sellers`, `transactions`, `receipts`.

### 4. Disable email confirmation in Supabase (for the demo)

By default Supabase requires email verification on signup, which slows down testing. For the hackathon:

Supabase Dashboard → Authentication → Providers → Email → toggle **Confirm email** OFF → Save.

(Re-enable for production.)

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test the signup flow

1. Click "Start selling on Vend"
2. Fill out the form. For BVN/DOB/identity, use the same values from your sandbox script — the sandbox doesn't validate them.
3. Submit
4. You should land on the dashboard, with a real Squad virtual account number displayed

If anything fails, check the browser console (F12) and the terminal where `npm run dev` is running.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Home
│   ├── signup/page.tsx       # Signup form
│   ├── login/page.tsx        # Login form
│   ├── dashboard/page.tsx    # Seller dashboard
│   └── api/signup/route.ts   # Server-side: creates Squad account + seller row
├── lib/
│   ├── supabase-browser.ts   # Supabase client for client components
│   ├── supabase-server.ts    # Supabase client for server components/API routes
│   └── payments/
│       ├── types.ts          # PaymentProvider interface
│       ├── squad.ts          # Squad implementation
│       └── index.ts          # Provider singleton
└── middleware.ts             # Auth session refresh
```

## What's next (Phase 2B)

- `/pay/[seller-id]` — public payment page
- Webhook handler at `/api/webhooks/squad`
- Transactions appearing on the dashboard
