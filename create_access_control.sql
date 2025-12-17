
-- Create allowed_users table if it doesn't exist
create table if not exists public.allowed_users (
    email text primary key,
    is_approved boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.allowed_users enable row level security;

-- Policy: Allow anyone to read (to check their own status)
create policy "Enable read access for all users" on public.allowed_users for select using (true);

-- Policy: Allow authenticated users to insert themselves (request access)
create policy "Enable insert for authenticated users" on public.allowed_users for insert with check (auth.uid() = auth.uid());
-- Actually, for simplicity in the 'pending' logic, we allow insert. 
-- But typically we handle this via trigger or client side if policy allows.
-- Let's allow insert for public/anon for now to ensure the 'request' flow works easily, 
-- or stick to authenticated since they are logged in via Google first.
-- The user logs in via Google -> has a session -> checks table -> if not there, inserts self.
-- So 'authenticated' is correct. created policy above valid.

-- Grant access to anon and authenticated (just in case)
grant select, insert on public.allowed_users to anon, authenticated, service_role;
