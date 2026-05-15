-- Vend hackathon — Phase 3 delta migration
-- Run this in Supabase SQL Editor on top of 02_pending_payments.sql.
--
-- Why seller_summaries?
-- The dashboard regenerates the AI weekly summary on every pageload, which
-- triggers a Gemini call each time. Free tier rate-limits at ~10 RPM, so even
-- a few rapid reloads (judge demo, dev iteration) return HTTP 429 and the
-- banner disappears. Caching the summary per seller, invalidated by a
-- fingerprint of the week's transaction state, makes the dashboard cheap to
-- reload and bulletproof for the live demo.

create table if not exists seller_summaries (
  seller_id uuid primary key references sellers(id) on delete cascade,
  summary_text text not null,
  -- fingerprint encodes the week-window state (count:totalKobo:lastTxnIso).
  -- If a new transaction lands or the week window slides, the fingerprint
  -- changes and the cache regenerates. Otherwise reloads hit cache.
  fingerprint text not null,
  updated_at timestamptz default now()
);

alter table seller_summaries enable row level security;

-- No public read or write. The dashboard reads + writes via service-role
-- admin client (the cache is server-rendered, never shipped to the browser
-- directly). Locked-down by default = no policies.
