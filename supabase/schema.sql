-- Vend hackathon — Phase 2A schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)
-- Safe to re-run: drops happen first.

-- Drop in reverse dependency order
drop table if exists receipts cascade;
drop table if exists transactions cascade;
drop table if exists sellers cascade;

-- Sellers table
create table sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,

  business_name text not null,                  -- "Tomi's Braids" — displayed to customers
  legal_first_name text not null,
  legal_middle_name text not null,
  legal_last_name text not null,
  phone text not null,
  email text not null,
  bvn text not null,                            -- sent to Squad, never displayed
  date_of_birth date not null,
  gender text not null check (gender in ('1', '2')),
  address text not null,
  business_description text not null,

  tier text not null default 'verified' check (tier in ('verified', 'registered')),

  -- Squad fields, populated after virtual account creation
  squad_virtual_account_number text,
  squad_bank_code text,
  squad_customer_identifier text unique,

  trust_score numeric default 0,
  created_at timestamptz default now()
);

-- Transactions table (used in Phase 2B but creating now to avoid two migrations)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id) on delete cascade not null,
  squad_transaction_ref text unique not null,   -- idempotency key for webhook replays
  amount_kobo bigint not null check (amount_kobo > 0),
  payer_name text,
  payer_email text,
  description text,
  ai_category text,
  status text not null check (status in ('success', 'failed', 'pending')),
  created_at timestamptz default now()
);

create index transactions_seller_id_idx on transactions(seller_id, created_at desc);

-- Receipts table (Phase 2C, creating now)
create table receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade unique not null,
  verification_code text unique not null,
  delivered_to text,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
-- Sellers can only see their own row. Service role bypasses this.
alter table sellers enable row level security;

create policy "Sellers can read own row"
  on sellers for select
  using (auth.uid() = user_id);

create policy "Sellers can update own row"
  on sellers for update
  using (auth.uid() = user_id);

-- Transactions: a seller sees only their own transactions
alter table transactions enable row level security;

create policy "Sellers can read own transactions"
  on transactions for select
  using (
    seller_id in (select id from sellers where user_id = auth.uid())
  );

-- Receipts: anyone can read by verification_code (it's the public verification feature)
alter table receipts enable row level security;

create policy "Anyone can read receipts"
  on receipts for select
  using (true);

-- Note: inserts to all three tables happen via server-side API routes using
-- the anon key + the user's session token. RLS allows writes through the
-- session, so we don't need separate insert policies for the seller's own data.
-- For the demo we'll do most writes from API routes.
