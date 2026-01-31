-- =============================================
-- SCHEMA PARA CORNELLÀ LOCAL
-- =============================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLA: profiles (extiende auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  phone text,
  email_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Función para calcular si puede escribir reseñas (30+ días y email verificado)
create or replace function can_write_reviews(user_id uuid)
returns boolean as $$
  select
    email_verified = true
    and created_at < now() - interval '30 days'
  from public.profiles
  where id = user_id;
$$ language sql security definer;

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- TABLA: categories (categorías de negocios)
-- =============================================
create table public.categories (
  id serial primary key,
  name text not null,
  slug text unique not null,
  icon text,
  description text,
  parent_id integer references public.categories(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: businesses (negocios)
-- =============================================
create table public.businesses (
  id serial primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  category_id integer references public.categories(id),
  subcategory text,
  address text,
  city text default 'Cornellà de Llobregat',
  postal_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  phone text,
  email text,
  website text,
  instagram text,
  opening_hours jsonb,
  images text[],
  logo_url text,
  is_verified boolean default false,
  verification_status text default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  verification_documents text[],
  rating decimal(2, 1) default 0,
  review_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: reviews (reseñas)
-- =============================================
create table public.reviews (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id integer references public.businesses(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  images text[],
  is_verified_purchase boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, business_id)
);

-- Función para actualizar rating promedio del negocio
create or replace function update_business_rating()
returns trigger as $$
begin
  update public.businesses
  set
    rating = (select avg(rating)::decimal(2,1) from public.reviews where business_id = coalesce(new.business_id, old.business_id)),
    review_count = (select count(*) from public.reviews where business_id = coalesce(new.business_id, old.business_id))
  where id = coalesce(new.business_id, old.business_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute procedure update_business_rating();

-- =============================================
-- TABLA: offers (ofertas y cupones)
-- =============================================
create table public.offers (
  id serial primary key,
  business_id integer references public.businesses(id) on delete cascade not null,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percentage', 'fixed', 'bogo', 'free')),
  discount_value decimal(10, 2),
  original_price decimal(10, 2),
  conditions text,
  code text,
  is_flash boolean default false,
  starts_at timestamp with time zone default timezone('utc'::text, now()),
  ends_at timestamp with time zone,
  max_redemptions integer,
  current_redemptions integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: jobs (ofertas de empleo)
-- =============================================
create table public.jobs (
  id serial primary key,
  business_id integer references public.businesses(id) on delete cascade not null,
  title text not null,
  description text,
  job_type text check (job_type in ('full_time', 'part_time', 'temporary', 'internship')),
  salary_min decimal(10, 2),
  salary_max decimal(10, 2),
  salary_period text check (salary_period in ('hour', 'month', 'year')),
  requirements text[],
  benefits text[],
  location text,
  is_remote boolean default false,
  status text default 'active' check (status in ('active', 'hired', 'expired', 'closed')),
  hired_at timestamp with time zone,
  expires_at timestamp with time zone default (now() + interval '60 days'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: job_applications (candidaturas)
-- =============================================
create table public.job_applications (
  id serial primary key,
  job_id integer references public.jobs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cover_letter text,
  cv_url text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(job_id, user_id)
);

-- =============================================
-- TABLA: budget_requests (solicitudes de presupuesto)
-- =============================================
create table public.budget_requests (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id integer references public.categories(id),
  category_name text,
  title text not null,
  description text not null,
  location text,
  urgency text check (urgency in ('low', 'medium', 'high', 'urgent')),
  preferred_date date,
  images text[],
  status text default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: budget_responses (respuestas a presupuestos)
-- =============================================
create table public.budget_responses (
  id serial primary key,
  request_id integer references public.budget_requests(id) on delete cascade not null,
  business_id integer references public.businesses(id) on delete cascade not null,
  price decimal(10, 2),
  message text,
  estimated_time text,
  is_accepted boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(request_id, business_id)
);

-- =============================================
-- TABLA: favorites (favoritos)
-- =============================================
create table public.favorites (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id integer references public.businesses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, business_id)
);

-- =============================================
-- TABLA: notifications (notificaciones)
-- =============================================
create table public.notifications (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text,
  icon text,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- TABLA: saved_coupons (cupones guardados)
-- =============================================
create table public.saved_coupons (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  offer_id integer references public.offers(id) on delete cascade not null,
  redeemed boolean default false,
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, offer_id)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.reviews enable row level security;
alter table public.offers enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.budget_requests enable row level security;
alter table public.budget_responses enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_coupons enable row level security;

-- Políticas para profiles
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Políticas para categories
create policy "Categories are viewable by everyone" on public.categories for select using (true);

-- Políticas para businesses
create policy "Businesses are viewable by everyone" on public.businesses for select using (true);
create policy "Business owners can update own business" on public.businesses for update using (auth.uid() = owner_id);
create policy "Authenticated users can create business" on public.businesses for insert with check (auth.uid() = owner_id);

-- Políticas para reviews
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);
create policy "Authenticated users can create reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "Users can update own reviews" on public.reviews for update using (auth.uid() = user_id);
create policy "Users can delete own reviews" on public.reviews for delete using (auth.uid() = user_id);

-- Políticas para offers
create policy "Offers are viewable by everyone" on public.offers for select using (true);
create policy "Business owners can manage offers" on public.offers for all using (
  auth.uid() in (select owner_id from public.businesses where id = business_id)
);

-- Políticas para jobs
create policy "Jobs are viewable by everyone" on public.jobs for select using (true);
create policy "Business owners can manage jobs" on public.jobs for all using (
  auth.uid() in (select owner_id from public.businesses where id = business_id)
);

-- Políticas para job_applications
create policy "Users can view own applications" on public.job_applications for select using (auth.uid() = user_id);
create policy "Business owners can view applications" on public.job_applications for select using (
  auth.uid() in (select owner_id from public.businesses b join public.jobs j on b.id = j.business_id where j.id = job_id)
);
create policy "Authenticated users can apply" on public.job_applications for insert with check (auth.uid() = user_id);

-- Políticas para budget_requests
create policy "Users can view own requests" on public.budget_requests for select using (auth.uid() = user_id);
create policy "Business owners can view requests in their category" on public.budget_requests for select using (true);
create policy "Authenticated users can create requests" on public.budget_requests for insert with check (auth.uid() = user_id);

-- Políticas para budget_responses
create policy "Request owners can view responses" on public.budget_responses for select using (
  auth.uid() in (select user_id from public.budget_requests where id = request_id)
);
create policy "Business owners can respond" on public.budget_responses for insert with check (
  auth.uid() in (select owner_id from public.businesses where id = business_id)
);

-- Políticas para favorites
create policy "Users can view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can manage own favorites" on public.favorites for all using (auth.uid() = user_id);

-- Políticas para notifications
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Políticas para saved_coupons
create policy "Users can view own saved coupons" on public.saved_coupons for select using (auth.uid() = user_id);
create policy "Users can manage own saved coupons" on public.saved_coupons for all using (auth.uid() = user_id);

-- =============================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =============================================
create index idx_businesses_category on public.businesses(category_id);
create index idx_businesses_verified on public.businesses(is_verified);
create index idx_reviews_business on public.reviews(business_id);
create index idx_offers_business on public.offers(business_id);
create index idx_offers_active on public.offers(is_active, ends_at);
create index idx_jobs_business on public.jobs(business_id);
create index idx_jobs_status on public.jobs(status);
create index idx_budget_requests_user on public.budget_requests(user_id);
create index idx_budget_requests_category on public.budget_requests(category_id);
create index idx_notifications_user on public.notifications(user_id, is_read);
