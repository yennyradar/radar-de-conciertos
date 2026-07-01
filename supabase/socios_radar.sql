-- ═══════════════════════════════════════════════════════════
--  TABLA: socios_radar
--  Programa de Socios Radar — establecimientos asociados
--  Ejecutar en: Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.socios_radar (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  tipo         text not null check (tipo in ('bar','restaurante','discoteca','hotel','estacionamiento','transporte','tienda','productora')),
  descripcion  text,
  direccion    text,
  ciudad       text not null,        -- alias de región, ej: 'santiago', 'valparaiso'
  lat          double precision,
  lng          double precision,
  telefono     text,
  website      text,
  instagram    text,
  imagen_url   text,
  promo_texto  text,                 -- oferta especial para asistentes, ej: "10% off con tu entrada"
  plan         text not null default 'basico' check (plan in ('basico','premium','destacado')),
  activo       boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Índices para consultas rápidas
create index if not exists socios_radar_ciudad_tipo_idx on public.socios_radar (ciudad, tipo, activo);
create index if not exists socios_radar_plan_idx on public.socios_radar (plan desc) where activo = true;

-- RLS: lectura pública, escritura solo admin
alter table public.socios_radar enable row level security;

create policy "Lectura pública de socios activos"
  on public.socios_radar for select
  using (activo = true);

create policy "Admin puede gestionar socios"
  on public.socios_radar for all
  using (auth.role() = 'authenticated');

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger socios_radar_updated_at
  before update on public.socios_radar
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
--  DATOS DE EJEMPLO (eliminar antes de producción)
-- ─────────────────────────────────────────────
insert into public.socios_radar (nombre,tipo,descripcion,direccion,ciudad,lat,lng,website,instagram,promo_texto,plan) values
  ('Bar El Clan','bar','Cerveza artesanal y música en vivo','Av. Providencia 1234, Providencia','santiago',-33.4324,-70.6091,'https://elbarclan.cl','@elbarclan','Cerveza gratis al mostrar tu entrada del concierto 🍺','destacado'),
  ('Restaurante La Piazza','restaurante','Cocina italiana y mediterránea','Loreto 123, Providencia','santiago',-33.4370,-70.6120,null,'@lapiazzacl','Menú especial pre-show $9.990','premium'),
  ('Cantina del Rock','bar','El bar de los rockeros','Av. Italia 456, Ñuñoa','santiago',-33.4500,-70.6050,null,null,'2x1 en tragos hasta las 20:00','basico');
