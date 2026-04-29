-- ─────────────────────────────────────────────────────────────────────────────
-- TechStore — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz default now() not null
);

-- 2. PRODUCTS
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10, 2) not null,
  category    text not null,
  image_url   text not null default '',
  description text not null default '',
  featured    boolean not null default false,
  stock       integer not null default 0,
  brand       text not null default '',
  created_at  timestamptz default now() not null
);

-- 3. ORDERS
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total       numeric(10, 2) not null,
  created_at  timestamptz default now() not null
);

-- 4. ORDER ITEMS
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders on delete cascade,
  product_id  uuid references public.products on delete set null,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10, 2) not null,
  created_at  timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Helper: check if current user is admin (avoids recursion)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES policies
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- PRODUCTS policies
create policy "products_select_all"
  on public.products for select
  using (true);

create policy "products_insert_admin"
  on public.products for insert
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products for update
  using (public.is_admin());

create policy "products_delete_admin"
  on public.products for delete
  using (public.is_admin());

-- ORDERS policies
create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin());

-- ORDER ITEMS policies
create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
    or public.is_admin()
  );

create policy "order_items_insert_own"
  on public.order_items for insert
  with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'user'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA — Sample IT products
-- (Optional: run this to populate the database with demo products)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.products (name, price, category, image_url, description, featured, stock, brand) values
  ('MacBook Pro 14" M3',       2499, 'Laptop',      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'Apple MacBook Pro with M3 chip. 16GB unified memory, 512GB SSD. Up to 22 hours battery life.',  true,  15, 'Apple'),
  ('Dell XPS 15',              1799, 'Laptop',      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80', 'Intel Core i7-13700H, 16GB DDR5, 512GB NVMe SSD, RTX 4060. 15.6" OLED display.',             true,   8, 'Dell'),
  ('AMD Ryzen 9 7950X',         699, 'Components',  'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80', '16-core, 32-thread processor. Max boost up to 5.7GHz. 80MB cache. AM5 socket.',             true,  25, 'AMD'),
  ('NVIDIA RTX 4080 Super',    1099, 'Components',  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', '16GB GDDR6X. DLSS 3.5, Ray Tracing. Ada Lovelace architecture. 4K gaming.',                false, 12, 'NVIDIA'),
  ('Samsung 990 Pro 2TB SSD',   179, 'Components',  'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=800&q=80', 'PCIe 4.0 NVMe. Read up to 7,450 MB/s. Enhanced thermal control. 5-year warranty.',          false, 40, 'Samsung'),
  ('Corsair 32GB DDR5 6000MHz', 129, 'Components',  'https://images.unsplash.com/photo-1591338800700-86d3a54f9c51?w=800&q=80', 'Vengeance DDR5 (2×16GB). XMP 3.0. 6000MHz. Dynamic RGB.',                                   false, 45, 'Corsair'),
  ('LG UltraGear 27" 4K 144Hz', 699, 'Monitor',    'https://images.unsplash.com/photo-1527443224154-c4a573d5c0f0?w=800&q=80', 'Nano IPS, 4K UHD, 144Hz, 1ms GTG. G-Sync Compatible. USB-C 90W.',                          false, 20, 'LG'),
  ('Logitech MX Master 3S',      99, 'Others', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80', '8000 DPI. MagSpeed scroll. Connect 3 devices. 70-day battery. Ergonomic.',                  false, 50, 'Logitech'),
  ('Corsair K95 RGB Platinum',  199, 'Others', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', 'Cherry MX Speed. Per-key RGB. 6 G-keys. Aluminum frame. USB passthrough.',                   false, 30, 'Corsair'),
  ('Sony WH-1000XM5',           349, 'Others', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'Industry-leading ANC. 30h battery. 8 mics. Multipoint for 2 devices.',                      false, 35, 'Sony'),
  ('TP-Link Archer AX90',       249, 'Smartphone',  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80', 'AX6600 Tri-Band Wi-Fi 6. 2.5G WAN. OFDMA + MU-MIMO. Covers 2500 sq ft.',                    false, 18, 'TP-Link'),
  ('ASUS ROG Strix G16',       1499, 'Gaming',      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80', 'i9-13980HX, RTX 4070, 16" 240Hz QHD, 32GB DDR5, 1TB SSD.',                                 false, 10, 'ASUS');

-- ─────────────────────────────────────────────────────────────────────────────
-- MAKE YOURSELF ADMIN
-- Replace 'your-email@example.com' with your actual email after signing up
-- ─────────────────────────────────────────────────────────────────────────────

-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
