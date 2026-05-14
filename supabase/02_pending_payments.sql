-- Vend hackathon — Phase 1 delta migration
-- Run this in Supabase SQL Editor on top of the original schema.sql (additive only).
--
-- Why pending_payments?
-- When the buyer fills the /pay form, they enter their name + email + amount.
-- We can't pass this to Squad's simulate-payment endpoint (it only accepts
-- virtual_account_number + amount). So we stage payer info in this table; when
-- Squad's webhook fires, the handler matches the inbound transaction to the
-- most recent unmatched pending row for that seller/amount and copies the
-- payer info onto the transaction.
--
-- In production (real bank transfers), Squad's webhook will carry payer name
-- from the bank's transfer metadata, so pending_payments becomes a fallback,
-- not the only source of payer info.

create table if not exists pending_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id) on delete cascade not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  payer_name text not null,
  payer_email text not null,
  payer_description text,
  matched_transaction_id uuid references transactions(id) on delete set null,
  expires_at timestamptz default (now() + interval '15 minutes'),
  created_at timestamptz default now()
);

create index if not exists pending_payments_lookup_idx
  on pending_payments(seller_id, amount_kobo, created_at desc)
  where matched_transaction_id is null;

alter table pending_payments enable row level security;

-- No public read or write. All access goes through service role from server-side routes.
-- (No policies = locked down by default.)
