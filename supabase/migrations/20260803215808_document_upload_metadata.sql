-- Additive metadata required by the authorized document workspace.
alter table public.documentos
  add column if not exists categoria text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists notas text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists documentos_context_status_idx
  on public.documentos(firm_id, company_id, period_id, estatus, created_at desc);

create index if not exists documentos_context_type_idx
  on public.documentos(firm_id, company_id, period_id, tipo_documento, created_at desc);
