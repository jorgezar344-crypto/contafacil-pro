-- Migración para el Dashboard del Contador

create table if not exists public.contadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  cedula_profesional text,
  created_at timestamptz not null default now()
);

alter table public.expedientes
  add column if not exists contador_id uuid references public.contadores(id) on delete set null;

alter table public.documentos
  add column if not exists notas_contador text,
  add column if not exists revisado_por_contador boolean not null default false,
  add column if not exists fecha_revision timestamptz;

alter table public.hallazgos
  add column if not exists resuelto boolean not null default false,
  add column if not exists resolucion_notas text;

-- Habilitar RLS y otorgar permisos a service_role
alter table public.contadores enable row level security;
revoke all on table public.contadores from anon, authenticated;
grant all on table public.contadores to service_role;

create index if not exists expedientes_contador_id_idx on public.expedientes(contador_id);
create index if not exists documentos_revisado_idx on public.documentos(revisado_por_contador);
