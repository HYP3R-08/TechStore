-- ─────────────────────────────────────────────────────────────────────────────
-- TechStore — complete database schema
--
-- FRESH INSTALL: run this file once in the Supabase SQL editor
--                (Dashboard → SQL Editor → New Query).
--
-- EXISTING DATABASE: do NOT run this. Run
--                    supabase/migrations/0001_authorization_and_stock_invariants.sql
--                    instead — it brings a database created by an older version
--                    of this file up to date.
--
-- This file is the source of truth for the schema. It is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
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
--
-- `variants` holds an array of { color, stock, images[] } objects. It is the
-- per-colour breakdown shown on the product page; `stock` on this table remains
-- the authoritative total used for availability and checkout.
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10, 2) not null check (price >= 0),
  category    text not null,
  image_url   text not null default '',
  images      text[] not null default array[]::text[],
  variants    jsonb not null default '[]'::jsonb,
  description text not null default '',
  featured    boolean not null default false,
  stock       integer not null default 0 check (stock >= 0),
  brand       text not null default '',
  created_at  timestamptz default now() not null
);

-- 3. ORDERS
--
-- Status lifecycle:
--   awaiting_payment  created at checkout, customer sent to Stripe, NOT paid yet
--   processing        Stripe webhook confirmed payment — stock is consumed here
--   shipped           admin dispatched it and set tracking_url
--   delivered         completed
--   cancelled         stock is credited back if it had been consumed
--
-- 'pending' is retained only for rows created before awaiting_payment existed.
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  status           text not null default 'awaiting_payment',
  total            numeric(10, 2) not null check (total >= 0),
  shipping_address jsonb,
  tracking_url     text,
  created_at       timestamptz default now() not null
);

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- 4. ORDER ITEMS
--
-- unit_price is the price captured at purchase time, so historical orders keep
-- their original amount when the product price later changes.
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders on delete cascade,
  product_id    uuid references public.products on delete set null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10, 2) not null check (unit_price >= 0),
  variant_index integer,
  created_at    timestamptz default now() not null
);

create index if not exists order_items_order_id_idx   on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists orders_user_id_idx         on public.orders (user_id);
create index if not exists products_category_idx      on public.products (category);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- SECURITY DEFINER so that policies on `profiles` can call it without recursing
-- back into those same policies. search_path is pinned: a SECURITY DEFINER
-- function runs with the owner's rights, and a mutable search_path would let a
-- caller redirect `profiles` to a table they control.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- WITH CHECK is spelled out, not left implicit: PostgreSQL would otherwise reuse
-- USING for the resulting row, and `auth.uid() = id` stays true while you edit
-- your own role — which would let any user grant themselves admin.
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using      (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Second, independent defence: the role column is immutable for non-admins even
-- if a future policy is written carelessly.
--
-- auth.uid() is null when the statement does not come from an end-user request
-- (SQL editor, migration, service_role). Those are left open on purpose so that
-- bootstrapping the first admin — see the bottom of this file — keeps working.
-- It is safe because RLS already gates the table: with a null auth.uid() the
-- update policy matches no row, so an anonymous request never reaches here.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only administrators can change a user role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- PRODUCTS — public catalogue, admin-only writes
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all"
  on public.products for select
  using (true);

drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin"
  on public.products for delete
  using (public.is_admin());

-- ORDERS
--
-- Customers may create their own order and read it back, but may NOT update it:
-- status transitions are driven by the Stripe webhook (service_role) and by
-- admins. This is what stops a customer from marking their own order as paid.
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

-- `status` is constrained, not just ownership: an order may only be created
-- unpaid. Checking ownership alone would let a customer insert an order already
-- marked 'processing', which the dashboard would show as paid and ship, with no
-- payment behind it. 'pending' is accepted only for rows from older versions.
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id and status in ('awaiting_payment', 'pending'));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin"
  on public.orders for delete
  using (public.is_admin());

-- ORDER ITEMS
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

drop policy if exists "order_items_delete_admin" on public.order_items;
create policy "order_items_delete_admin"
  on public.order_items for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK MOVEMENTS
--
-- Stock is a database invariant, not something a client asks for. One trigger
-- owns both directions, keyed on the status transition:
--
--   * quantities are aggregated per product first. `update ... from order_items`
--     without aggregation applies only ONE arbitrary matching row per target, so
--     an order holding two variants of the same product would consume stock once
--     instead of twice.
--   * stock is credited back only for orders that actually consumed it, so
--     cancelling an unpaid order cannot invent inventory.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_order_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  consumed_before boolean := old.status in ('processing', 'shipped', 'delivered');
  consumed_after  boolean := new.status in ('processing', 'shipped', 'delivered');
begin
  if consumed_after and not consumed_before then
    update public.products p
    set stock = greatest(0, p.stock - agg.qty)
    from (
      select product_id, sum(quantity) as qty
      from public.order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) agg
    where agg.product_id = p.id;

  elsif consumed_before and not consumed_after then
    update public.products p
    set stock = p.stock + agg.qty
    from (
      select product_id, sum(quantity) as qty
      from public.order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) agg
    where agg.product_id = p.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_order_confirmed      on public.orders;
drop trigger if exists on_order_stock_movement on public.orders;
create trigger on_order_stock_movement
  after update of status on public.orders
  for each row execute function public.handle_order_stock_movement();

-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLIC SALES AGGREGATE
--
-- Powers the "best sellers" section on the home page, which is public, so this
-- is intentionally callable by anonymous visitors. It returns per-product sales
-- counts only — no customer, order or revenue data.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_product_sales()
returns table (product_id uuid, total_sold bigint)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::bigint as total_sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status in ('processing', 'shipped', 'delivered')
    and oi.product_id is not null
  group by oi.product_id;
$$;

revoke all on function public.get_product_sales() from public;
grant execute on function public.get_product_sales() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE — product images
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_upload" on storage.objects;
create policy "product_images_admin_upload"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA — optional demo catalogue
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.products (name, price, category, image_url, description, featured, stock, brand)
select * from (values
  ('MacBook Pro 14" M3',       2499::numeric, 'Laptop',     'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'Apple MacBook Pro with M3 chip. 16GB unified memory, 512GB SSD.', true,  15, 'Apple'),
  ('Dell XPS 15',              1799::numeric, 'Laptop',     'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80', 'Intel Core i7-13700H, 16GB DDR5, 512GB NVMe SSD, RTX 4060.',     true,   8, 'Dell'),
  ('AMD Ryzen 9 7950X',         699::numeric, 'Components', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80', '16-core, 32-thread processor. Max boost up to 5.7GHz.',          true,  25, 'AMD'),
  ('NVIDIA RTX 4080 Super',    1099::numeric, 'Components', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', '16GB GDDR6X. DLSS 3.5, Ray Tracing. 4K gaming.',                 false, 12, 'NVIDIA'),
  ('Samsung 990 Pro 2TB SSD',   179::numeric, 'Components', 'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=800&q=80', 'PCIe 4.0 NVMe. Read up to 7,450 MB/s. 5-year warranty.',         false, 40, 'Samsung'),
  ('LG UltraGear 27" 4K 144Hz', 699::numeric, 'Monitor',    'https://images.unsplash.com/photo-1527443224154-c4a573d5c0f0?w=800&q=80', 'Nano IPS, 4K UHD, 144Hz, 1ms GTG. G-Sync Compatible.',           false, 20, 'LG'),
  ('Logitech MX Master 3S',      99::numeric, 'Others',     'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80', '8000 DPI. MagSpeed scroll. 70-day battery.',                     false, 50, 'Logitech'),
  ('Sony WH-1000XM5',           349::numeric, 'Others',     'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'Industry-leading ANC. 30h battery. 8 mics.',                     false, 35, 'Sony'),
  ('ASUS ROG Strix G16',       1499::numeric, 'Gaming',     'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80', 'i9-13980HX, RTX 4070, 16" 240Hz QHD, 32GB DDR5, 1TB SSD.',       false, 10, 'ASUS')
) as seed(name, price, category, image_url, description, featured, stock, brand)
where not exists (select 1 from public.products);

-- ─────────────────────────────────────────────────────────────────────────────
-- MAKE YOURSELF ADMIN
-- Sign up through the app first, then run this once with your own email.
-- ─────────────────────────────────────────────────────────────────────────────

-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
