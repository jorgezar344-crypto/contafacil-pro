-- Local-only RLS verification. Run with:
-- docker exec -i supabase_db_files-mentioned-by-the-user-quiero psql -U postgres -d postgres < tests/rls-isolation.sql
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'firm-admin-a@example.test', 'local-fixture', now(), '{"provider":"email"}', '{"full_name":"Firm Admin A"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'accountant-a@example.test', 'local-fixture', now(), '{"provider":"email"}', '{"full_name":"Accountant A"}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'assistant-a@example.test', 'local-fixture', now(), '{"provider":"email"}', '{"full_name":"Assistant A"}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client-a@example.test', 'local-fixture', now(), '{"provider":"email"}', '{"full_name":"Client A"}', now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'firm-admin-b@example.test', 'local-fixture', now(), '{"provider":"email"}', '{"full_name":"Firm Admin B"}', now(), now());

insert into public.accounting_firms (id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', 'Firm A', 'firm-a'),
  ('20000000-0000-0000-0000-000000000002', 'Firm B', 'firm-b');
insert into public.firm_members (firm_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'firm_admin'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'accountant'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'assistant'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'client_user'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'firm_admin');
insert into public.client_companies (id, firm_id, legal_name, rfc) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Company A', 'XAXX010101000'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Company B', 'XEXX010101000');
insert into public.company_members (company_id, user_id, access_level) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'owner');
insert into public.accounting_periods (id, firm_id, company_id, year, month) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2026, 8),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 2026, 8);
insert into public.clientes (id, nombre, razon_social, rfc) values
  ('50000000-0000-0000-0000-000000000001', 'Legacy A', 'Legacy A', 'AAA010101AAA'),
  ('50000000-0000-0000-0000-000000000002', 'Legacy B', 'Legacy B', 'BBB010101BBB');
insert into public.expedientes (id, cliente_id, periodo_fiscal, firm_id, company_id, period_id) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '2026-08', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '2026-08', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002');
insert into public.documentos (id, expediente_id, tipo_documento, estatus, firm_id, company_id, period_id) values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'XML', 'uploaded', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'XML', 'uploaded', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002');

create or replace function pg_temp.assert_document_count(user_id uuid, expected_count integer, label text)
returns void language plpgsql as $$ declare actual_count integer; begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select count(*) into actual_count from public.documentos;
  reset role;
  if actual_count <> expected_count then raise exception '% expected %, got %', label, expected_count, actual_count; end if;
end $$;

select pg_temp.assert_document_count('10000000-0000-0000-0000-000000000001', 1, 'firm_admin isolation');
select pg_temp.assert_document_count('10000000-0000-0000-0000-000000000002', 1, 'accountant isolation');
select pg_temp.assert_document_count('10000000-0000-0000-0000-000000000003', 1, 'assistant isolation');
select pg_temp.assert_document_count('10000000-0000-0000-0000-000000000004', 1, 'client_user company isolation');
select pg_temp.assert_document_count('10000000-0000-0000-0000-000000000005', 1, 'cross-firm isolation');

rollback;
