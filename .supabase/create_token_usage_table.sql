-- AI Token Usage Tracking
-- Stores detailed token usage for cost analysis.

create table if not exists public.ai_token_usage (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    model text not null, -- e.g., 'gemini-1.5-flash', 'gemini-1.5-pro'
    input_tokens int not null default 0,
    output_tokens int not null default 0,
    total_tokens int generated always as (input_tokens + output_tokens) stored,
    
    cost_usd numeric(10, 6) default 0 -- Estimated cost in USD
);

-- Enable RLS
alter table public.ai_token_usage enable row level security;

-- Policies
create policy "Users can view their own usage"
    on public.ai_token_usage for select
    using (true); -- Ideally restrict to admin/user, but for now open for the app

create policy "Users can insert usage"
    on public.ai_token_usage for insert
    with check (true);
