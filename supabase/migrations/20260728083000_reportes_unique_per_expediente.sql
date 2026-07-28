drop index if exists public.reportes_expediente_id_idx;

create unique index reportes_expediente_id_unique
  on public.reportes(expediente_id);
