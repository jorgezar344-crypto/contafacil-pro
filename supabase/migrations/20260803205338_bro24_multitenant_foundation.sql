-- BRO24 phase 1: additive multi-tenant foundation.
-- This migration never deletes or rewrites historical records.

create schema if not exists bro24_private;

create table if not exists public.accounting_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.firm_members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.accounting_firms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('platform_admin', 'firm_admin', 'supervisor', 'accountant', 'assistant', 'client_user')),
  status text not null default 'active' check (status in ('invited', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (firm_id, user_id)
);

create table if not exists public.client_companies (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.accounting_firms(id) on delete restrict,
  legal_name text not null,
  commercial_name text,
  rfc text not null,
  tax_regime text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, rfc)
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.client_companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_level text not null default 'viewer' check (access_level in ('owner', 'contributor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.accounting_firms(id) on delete restrict,
  company_id uuid not null references public.client_companies(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  status text not null default 'open' check (status in ('open', 'locked', 'closed')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, year, month)
);

-- New nullable context columns keep all current production-shaped records intact.
alter table public.expedientes
  add column if not exists firm_id uuid references public.accounting_firms(id) on delete restrict,
  add column if not exists company_id uuid references public.client_companies(id) on delete restrict,
  add column if not exists period_id uuid references public.accounting_periods(id) on delete restrict,
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null;

alter table public.documentos
  add column if not exists firm_id uuid references public.accounting_firms(id) on delete restrict,
  add column if not exists company_id uuid references public.client_companies(id) on delete restrict,
  add column if not exists period_id uuid references public.accounting_periods(id) on delete restrict,
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null,
  add column if not exists storage_path text,
  add column if not exists sha256 text,
  add column if not exists request_id uuid,
  add column if not exists processing_status text;

create unique index if not exists documentos_company_sha256_unique
  on public.documentos(company_id, sha256)
  where company_id is not null and sha256 is not null;
create unique index if not exists documentos_company_request_unique
  on public.documentos(company_id, request_id)
  where company_id is not null and request_id is not null;
create index if not exists firm_members_firm_user_idx on public.firm_members(firm_id, user_id);
create index if not exists company_members_company_user_idx on public.company_members(company_id, user_id);
create index if not exists client_companies_firm_idx on public.client_companies(firm_id);
create index if not exists accounting_periods_firm_company_idx on public.accounting_periods(firm_id, company_id, year, month);
create index if not exists expedientes_firm_company_period_idx on public.expedientes(firm_id, company_id, period_id);
create index if not exists documentos_firm_company_period_idx on public.documentos(firm_id, company_id, period_id, created_at desc);

-- Creates an application profile when a user is created by Supabase Auth.
create or replace function bro24_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bro24 on auth.users;
create trigger on_auth_user_created_bro24
  after insert on auth.users
  for each row execute function bro24_private.handle_new_auth_user();

revoke all on schema bro24_private from public;
revoke all on function bro24_private.handle_new_auth_user() from public;
