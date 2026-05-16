
-- Enums
create type public.app_role as enum ('chw', 'facility_admin', 'ndma', 'public_viewer');
create type public.risk_tier as enum ('NORMAL', 'WATCH', 'HIGH', 'CRITICAL');
create type public.case_outcome as enum ('treat_at_home', 'refer', 'emergency');

-- Districts
create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  province text not null default 'Gilgit Baltistan',
  population integer,
  centroid_lat double precision,
  centroid_lng double precision,
  created_at timestamptz not null default now()
);

-- Lakes
create table public.lakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district_id uuid references public.districts(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  elevation_m integer,
  area_km2 numeric,
  current_risk_score numeric not null default 0,
  current_tier public.risk_tier not null default 'NORMAL',
  current_confidence numeric not null default 0.8,
  downstream_population integer not null default 0,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index lakes_district_idx on public.lakes(district_id);

-- Risk score history
create table public.lake_risk_scores (
  id uuid primary key default gen_random_uuid(),
  lake_id uuid not null references public.lakes(id) on delete cascade,
  score numeric not null,
  tier public.risk_tier not null,
  confidence numeric not null,
  source text not null default 'sentinel-1',
  observed_at timestamptz not null default now()
);
create index risk_lake_time on public.lake_risk_scores(lake_id, observed_at desc);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  lake_id uuid references public.lakes(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  tier public.risk_tier not null,
  title text not null,
  body_en text not null,
  body_ur text,
  estimated_window text,
  affected_population integer default 0,
  issued_by uuid,
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_created_idx on public.alerts(created_at desc);

-- Facilities
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district_id uuid references public.districts(id) on delete set null,
  lat double precision,
  lng double precision,
  type text not null default 'BHU',
  vulnerability text not null default 'low',
  created_at timestamptz not null default now()
);

-- User roles (separate table, security best practice)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- CHW profiles
create table public.chw_profiles (
  id uuid primary key,
  full_name text not null default 'CHW',
  district_id uuid references public.districts(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  phone text,
  language text not null default 'ur',
  created_at timestamptz not null default now()
);

-- Trigger: auto-create chw profile and default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chw_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Community Health Worker'))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'chw')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Alert acknowledgements
create table public.alert_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  chw_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  unique (alert_id, chw_id)
);

-- Cases
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  chw_id uuid not null,
  district_id uuid references public.districts(id) on delete set null,
  patient_age integer,
  patient_sex text,
  symptoms text not null,
  diagnosis text,
  treatment text,
  outcome public.case_outcome,
  is_disaster_related boolean not null default false,
  created_at timestamptz not null default now()
);
create index cases_chw_idx on public.cases(chw_id, created_at desc);
create index cases_district_idx on public.cases(district_id, created_at desc);

-- Protocols (RAG corpus)
create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  body text not null,
  source text not null default 'WHO IMNCI',
  is_disaster boolean not null default false,
  created_at timestamptz not null default now()
);

-- Broadcast messages
create table public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.districts(id) on delete set null,
  sender_id uuid not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.districts enable row level security;
alter table public.lakes enable row level security;
alter table public.lake_risk_scores enable row level security;
alter table public.alerts enable row level security;
alter table public.facilities enable row level security;
alter table public.chw_profiles enable row level security;
alter table public.alert_acknowledgements enable row level security;
alter table public.cases enable row level security;
alter table public.protocols enable row level security;
alter table public.broadcast_messages enable row level security;

-- Public read policies (open data layer)
create policy "Public can read districts" on public.districts for select using (true);
create policy "Public can read lakes" on public.lakes for select using (true);
create policy "Public can read risk scores" on public.lake_risk_scores for select using (true);
create policy "Public can read alerts" on public.alerts for select using (true);
create policy "Public can read facilities" on public.facilities for select using (true);
create policy "Public can read protocols" on public.protocols for select using (true);
create policy "Public can read broadcasts" on public.broadcast_messages for select using (true);

-- CHW profile: users see/edit their own
create policy "CHW reads own profile" on public.chw_profiles for select using (auth.uid() = id);
create policy "CHW updates own profile" on public.chw_profiles for update using (auth.uid() = id);
create policy "Admins read all profiles" on public.chw_profiles for select
  using (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));

-- User roles: users see own; only NDMA can modify
create policy "Users read own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "NDMA manages roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'ndma'))
  with check (public.has_role(auth.uid(), 'ndma'));

-- Cases: CHW reads/writes their own; admins read all
create policy "CHW reads own cases" on public.cases for select using (auth.uid() = chw_id);
create policy "CHW inserts own cases" on public.cases for insert with check (auth.uid() = chw_id);
create policy "CHW updates own cases" on public.cases for update using (auth.uid() = chw_id);
create policy "Admins read all cases" on public.cases for select
  using (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));

-- Acknowledgements: CHW writes own; admins read all; CHW reads own
create policy "CHW reads own acks" on public.alert_acknowledgements for select using (auth.uid() = chw_id);
create policy "CHW inserts own acks" on public.alert_acknowledgements for insert with check (auth.uid() = chw_id);
create policy "Admins read acks" on public.alert_acknowledgements for select
  using (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));

-- Broadcasts: admins insert
create policy "Admins insert broadcasts" on public.broadcast_messages for insert
  with check (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));

-- Alerts: admins insert (simulation tool); public read above
create policy "Admins insert alerts" on public.alerts for insert
  with check (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));
create policy "Admins update alerts" on public.alerts for update
  using (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));

-- Risk scores: admins can insert (simulation)
create policy "Admins insert risk scores" on public.lake_risk_scores for insert
  with check (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));
create policy "Admins update lakes" on public.lakes for update
  using (public.has_role(auth.uid(), 'ndma') or public.has_role(auth.uid(), 'facility_admin'));
