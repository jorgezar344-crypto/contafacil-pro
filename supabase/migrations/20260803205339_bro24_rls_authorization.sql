-- BRO24 phase 1: authorization helpers and RLS policies.
-- Mutations remain server-controlled until the authenticated API routes are enabled.

create or replace function bro24_private.is_firm_member(target_firm_id uuid, allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.firm_members fm
    where fm.firm_id = target_firm_id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and (allowed_roles is null or fm.role = any(allowed_roles))
  );
$$;

create or replace function bro24_private.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function bro24_private.is_firm_member(uuid, text[]) from public;
revoke all on function bro24_private.is_company_member(uuid) from public;
grant usage on schema bro24_private to authenticated;
grant execute on function bro24_private.is_firm_member(uuid, text[]) to authenticated;
grant execute on function bro24_private.is_company_member(uuid) to authenticated;

alter table public.accounting_firms enable row level security;
alter table public.profiles enable row level security;
alter table public.firm_members enable row level security;
alter table public.client_companies enable row level security;
alter table public.company_members enable row level security;
alter table public.accounting_periods enable row level security;

grant select on public.accounting_firms, public.profiles, public.firm_members,
  public.client_companies, public.company_members, public.accounting_periods,
  public.expedientes, public.documentos, public.hallazgos, public.reportes
  to authenticated;

create policy "profiles_read_self" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "firms_read_membership" on public.accounting_firms for select to authenticated
  using (bro24_private.is_firm_member(id));

create policy "firm_members_read_self_or_admin" on public.firm_members for select to authenticated
  using (user_id = (select auth.uid()) or bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor']));

create policy "companies_read_authorized" on public.client_companies for select to authenticated
  using (bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant']) or bro24_private.is_company_member(id));

create policy "company_members_read_authorized" on public.company_members for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.client_companies cc
    where cc.id = company_id
      and bro24_private.is_firm_member(cc.firm_id, array['firm_admin', 'supervisor'])
  ));

create policy "periods_read_authorized" on public.accounting_periods for select to authenticated
  using (bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant']) or bro24_private.is_company_member(company_id));

-- Existing data rows with no tenant context remain unavailable to browser clients.
create policy "expedientes_read_authorized" on public.expedientes for select to authenticated
  using (firm_id is not null and company_id is not null and (
    bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant'])
    or bro24_private.is_company_member(company_id)
  ));

create policy "documentos_read_authorized" on public.documentos for select to authenticated
  using (firm_id is not null and company_id is not null and (
    bro24_private.is_firm_member(firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant'])
    or bro24_private.is_company_member(company_id)
  ));

create policy "hallazgos_read_authorized" on public.hallazgos for select to authenticated
  using (exists (
    select 1 from public.documentos d
    where d.id = documento_id
      and d.firm_id is not null and d.company_id is not null
      and (bro24_private.is_firm_member(d.firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant']) or bro24_private.is_company_member(d.company_id))
  ));

create policy "reportes_read_authorized" on public.reportes for select to authenticated
  using (exists (
    select 1 from public.expedientes e
    where e.id = expediente_id
      and e.firm_id is not null and e.company_id is not null
      and (bro24_private.is_firm_member(e.firm_id, array['firm_admin', 'supervisor', 'accountant', 'assistant']) or bro24_private.is_company_member(e.company_id))
  ));
