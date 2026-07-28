create extension if not exists pgcrypto;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rfc text not null,
  razon_social text not null,
  email text,
  telefono text,
  created_at timestamptz not null default now(),
  constraint clientes_rfc_unique unique (rfc),
  constraint clientes_rfc_format check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$')
);

create table public.expedientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  periodo_fiscal text not null,
  estatus text not null default 'recibido',
  contador_asignado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expedientes_cliente_periodo_unique unique (cliente_id, periodo_fiscal)
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  tipo_documento text not null,
  nombre_archivo text,
  url_archivo text,
  estatus text not null default 'recibido',
  confidence numeric(5,2),
  subtotal numeric(14,2),
  iva numeric(14,2),
  total numeric(14,2),
  rfc_detectado text,
  fecha_documento date,
  created_at timestamptz not null default now(),
  constraint documentos_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 100)
  )
);

create table public.hallazgos (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos(id) on delete cascade,
  tipo text not null,
  descripcion text not null,
  prioridad text not null default 'media',
  created_at timestamptz not null default now(),
  constraint hallazgos_prioridad_check check (prioridad in ('baja', 'media', 'alta'))
);

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  ingresos numeric(14,2) not null default 0,
  gastos numeric(14,2) not null default 0,
  iva_trasladado numeric(14,2) not null default 0,
  iva_acreditable numeric(14,2) not null default 0,
  diferencia_iva numeric(14,2) not null default 0,
  observaciones text,
  created_at timestamptz not null default now()
);

create index expedientes_cliente_id_idx on public.expedientes(cliente_id);
create index expedientes_periodo_fiscal_idx on public.expedientes(periodo_fiscal);
create index documentos_expediente_id_idx on public.documentos(expediente_id);
create index documentos_estatus_idx on public.documentos(estatus);
create index documentos_fecha_documento_idx on public.documentos(fecha_documento);
create index hallazgos_documento_id_idx on public.hallazgos(documento_id);
create index hallazgos_prioridad_idx on public.hallazgos(prioridad);
create index reportes_expediente_id_idx on public.reportes(expediente_id);

alter table public.clientes enable row level security;
alter table public.expedientes enable row level security;
alter table public.documentos enable row level security;
alter table public.hallazgos enable row level security;
alter table public.reportes enable row level security;

revoke all on table public.clientes from anon, authenticated;
revoke all on table public.expedientes from anon, authenticated;
revoke all on table public.documentos from anon, authenticated;
revoke all on table public.hallazgos from anon, authenticated;
revoke all on table public.reportes from anon, authenticated;

grant all on table public.clientes to service_role;
grant all on table public.expedientes to service_role;
grant all on table public.documentos to service_role;
grant all on table public.hallazgos to service_role;
grant all on table public.reportes to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documentos-fiscales-demo',
  'documentos-fiscales-demo',
  false,
  20971520,
  array[
    'application/pdf',
    'application/xml',
    'text/xml',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on table storage.objects from anon, authenticated;
grant all on table storage.objects to service_role;
