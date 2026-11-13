-- Supabase starter schema for SAJANG AI STORE MANAGER.
-- Apply in Supabase SQL Editor. Enable RLS before connecting a production frontend.
create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (store_id,user_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  source text not null default 'manual',
  external_review_id text,
  customer_alias text,
  rating int check (rating between 1 and 5),
  content text not null,
  reply_draft text,
  reply_status text not null default 'pending' check (reply_status in ('pending','approved','published','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_alias text not null,
  permitted_reference text,
  visit_count int not null default 0,
  note text,
  consent_basis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.improvement_tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  assignee_id uuid references auth.users(id),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.social_drafts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  platform text not null check (platform in ('instagram','threads')),
  topic text,
  body text not null,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft','approved','scheduled','published')),
  created_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.reviews enable row level security;
alter table public.customer_notes enable row level security;
alter table public.improvement_tasks enable row level security;
alter table public.social_drafts enable row level security;

-- Starter owner-only policies. Add store-member policies and role checks before inviting staff.
create policy "owners manage own stores" on public.stores
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- IMPORTANT: Do not expose tables to client access until policies are completed and tested.
-- The frontend in this ZIP intentionally uses localStorage demo data and does not connect to Supabase yet.
