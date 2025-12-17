-- Create table for Oracle Logic Chains
create table if not exists logic_chains (
  id uuid default gen_random_uuid() primary key,
  market_target text not null, -- 'KR' or 'US'
  primary_keyword text not null,
  cause text not null,
  effect text not null,
  beneficiary_sector text not null,
  related_tickers jsonb not null default '[]'::jsonb,
  logic_strength numeric not null,
  alpha_gap numeric not null,
  rationale text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table logic_chains enable row level security;

-- Create policy to allow all operations for authenticated users (or public for now if needed)
create policy "Enable all access for all users" on logic_chains
  for all using (true) with check (true);

-- Create index for faster queries
create index if not exists logic_chains_created_at_idx on logic_chains (created_at desc);
create index if not exists logic_chains_market_target_idx on logic_chains (market_target);
