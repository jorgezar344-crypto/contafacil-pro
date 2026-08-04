-- Additive status, action and audit support for authorized document operations.
alter table public.documentos
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists replaces_document_id uuid references public.documentos(id) on delete set null,
  add column if not exists replaced_by_document_id uuid references public.documentos(id) on delete set null;

create table if not exists public.document_field_corrections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documentos(id) on delete cascade,
  firm_id uuid not null references public.accounting_firms(id) on delete restrict,
  company_id uuid not null references public.client_companies(id) on delete restrict,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  field_name text not null,
  raw_value jsonb,
  normalized_value jsonb,
  corrected_value jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  firm_id uuid not null references public.accounting_firms(id) on delete restrict,
  company_id uuid not null references public.client_companies(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_document_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index if not exists corrections_document_idx on public.document_field_corrections(document_id, created_at desc);

alter table public.document_field_corrections enable row level security;
alter table public.audit_events enable row level security;
grant select on public.document_field_corrections, public.audit_events to authenticated;

create policy "document_corrections_read_authorized" on public.document_field_corrections for select to authenticated using (
  bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant'])
  or bro24_private.is_company_member(company_id)
);
create policy "audit_events_read_authorized" on public.audit_events for select to authenticated using (
  bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant'])
  or bro24_private.is_company_member(company_id)
);
