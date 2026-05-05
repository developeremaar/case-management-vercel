create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  mobile text,
  organization_id uuid not null,
  branch_id uuid,
  department_id uuid,
  role_id uuid not null,
  is_primary boolean default false,
  is_active boolean default true,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invitation_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by_membership_id uuid,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_invitations enable row level security;

create policy "Authenticated users can view invitations"
  on public.user_invitations for select
  to authenticated
  using (true);

create policy "Authenticated users can insert invitations"
  on public.user_invitations for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update invitations"
  on public.user_invitations for update
  to authenticated
  using (true)
  with check (true);