-- ─────────────────────────────────────────────────────────────────────────────
-- TechStore — brings an existing database up to the current schema
--
-- Run this ONCE against a database created by an earlier version
-- (Dashboard → SQL Editor). It is idempotent: running it twice is safe.
--
-- A fresh database does not need this file — supabase-schema.sql already
-- creates everything below. The two are kept in step.
--
-- What it establishes:
--   1. Every column the application queries
--   2. `awaiting_payment`, so an order is only real once Stripe confirms it
--   3. Authorization that holds at the database, not just in the UI
--   4. Stock as a database invariant, owned by a single trigger
--   5. A fixed search_path on every SECURITY DEFINER function
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Columns the application relies on
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products    add column if not exists variants         jsonb   not null default '[]'::jsonb;
alter table public.products    add column if not exists images           text[]  not null default array[]::text[];
alter table public.orders      add column if not exists shipping_address jsonb;
alter table public.orders      add column if not exists tracking_url     text;
alter table public.order_items add column if not exists variant_index    integer;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Order status: 'awaiting_payment'
--
-- An order row is created before the customer reaches Stripe. Until the webhook
-- confirms payment it stays 'awaiting_payment' — not a real order, and never
-- shown as one in the admin dashboard.
--
-- The constraint name is discovered rather than assumed: PostgreSQL generates it
-- for an inline column check, and the generated name is not guaranteed.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. is_admin()
--
-- SECURITY DEFINER so that policies on `profiles` can call it without recursing
-- back into those same policies.
--
-- search_path is pinned because SECURITY DEFINER runs with the owner's rights:
-- with a mutable search_path a caller could prepend a schema and have `profiles`
-- resolve to a table they control. This is the function that decides who is an
-- admin, so it is the last one to leave open.
-- ─────────────────────────────────────────────────────────────────────────────

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
-- 3. The `role` column is not the customer's to write
--
-- WITH CHECK is spelled out rather than left implicit. In PostgreSQL an UPDATE
-- policy with no WITH CHECK reuses its USING clause for the resulting row — and
-- `auth.uid() = id` stays true while you edit your own `role`, which would let
-- any signed-up user grant themselves admin and open every admin-gated policy
-- in this schema.
--
-- Two independent defences, because this is the hinge the whole model turns on:
--   a) an explicit WITH CHECK on the policy
--   b) a trigger rejecting role changes from non-admins, so the rule still holds
--      if a future policy is written carelessly
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own"          on public.profiles;
drop policy if exists "profiles_update_admin"        on public.profiles;

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using      (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- auth.uid() is null when the statement does not come from an end-user request:
-- the SQL editor, a migration, or the service_role key. Those paths are left
-- open on purpose — bootstrapping the first admin
--   update public.profiles set role = 'admin' where email = '...'
-- has no signed-in user behind it and must keep working.
--
-- That exception is safe because RLS already gates the table: with a null
-- auth.uid() the `profiles_update_own_or_admin` policy matches no row, so an
-- anonymous PostgREST request cannot reach this trigger at all.
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3b. Orders — a customer cannot declare their own order paid
--
-- Confirming a payment belongs to Stripe, reported through a signed webhook that
-- runs as service_role. No customer-facing policy may grant a status change:
-- an UPDATE policy of the shape
--     using (user_id = auth.uid() and status = 'pending')
--     with check (user_id = auth.uid() and status = 'processing')
-- hands the customer the payment confirmation itself, which is the one decision
-- the client must never make. It is dropped here by name.
--
-- The insert policy constrains `status` too, not just ownership: an order may
-- only be created unpaid. Ownership alone would let a customer insert an order
-- already marked 'processing', which the dashboard would show as paid and ship.
--
-- 'pending' is accepted alongside 'awaiting_payment' so a browser still running
-- an older frontend keeps working across a deploy.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Users can confirm their own orders" on public.orders;
drop policy if exists "orders_update_own"                  on public.orders;

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id and status in ('awaiting_payment', 'pending'));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
  on public.orders for update
  using      (public.is_admin())
  with check (public.is_admin());

-- The admin dashboard deletes cancelled orders, so the DELETE policy has to
-- exist: RLS discards an unpolicied delete silently, reporting no error.
--
-- The "Admin can ..." variants are dropped so the same rule is not expressed
-- twice under two names. They inline the profiles lookup that is_admin() already
-- encapsulates; policies are OR'd, so leaving them would mean maintaining one
-- rule in two places and hoping they never diverge.
drop policy if exists "Admin can delete orders" on public.orders;
drop policy if exists "orders_delete_admin"     on public.orders;
create policy "orders_delete_admin"
  on public.orders for delete
  using (public.is_admin());

drop policy if exists "Admin can delete order_items" on public.order_items;
drop policy if exists "order_items_delete_admin"     on public.order_items;
create policy "order_items_delete_admin"
  on public.order_items for delete
  using (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
  on public.products for update
  using      (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Stock movements as a database invariant
--
-- One trigger owns stock in both directions, keyed on the status transition, so
-- inventory cannot be moved out of band by whatever a client decides to call.
--
-- Three things it has to get right:
--
--   * Variants carry their own stock. When an order line names a variant, that
--     variant's stock moves and products.stock is recomputed as the sum — which
--     is the same rule the admin dashboard applies when saving a product. Moving
--     products.stock alone would be undone by the next save.
--   * The product is re-read on each iteration, so two lines naming different
--     variants of the same product both land instead of overwriting each other.
--   * Stock is credited back only for orders that actually consumed it, so
--     cancelling an order that was never paid cannot invent inventory.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_order_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item            record;
  prod            public.products%rowtype;
  new_variants    jsonb;
  direction       int;
  consumed_before boolean := old.status in ('processing', 'shipped', 'delivered');
  consumed_after  boolean := new.status in ('processing', 'shipped', 'delivered');
begin
  if consumed_after and not consumed_before then
    direction := -1;
  elsif consumed_before and not consumed_after then
    direction := 1;
  else
    return new;
  end if;

  for item in
    select product_id, quantity, variant_index
    from public.order_items
    where order_id = new.id and product_id is not null
  loop
    select * into prod from public.products where id = item.product_id;
    continue when not found;

    -- A variant index that no longer resolves (the product was edited after the
    -- order) falls back to the product total rather than raising, so a stale
    -- index cannot block an order from being cancelled.
    if item.variant_index is not null
       and jsonb_typeof(prod.variants) = 'array'
       and item.variant_index < jsonb_array_length(prod.variants)
    then
      new_variants := jsonb_set(
        prod.variants,
        array[item.variant_index::text, 'stock'],
        to_jsonb(
          greatest(
            0,
            coalesce((prod.variants -> item.variant_index ->> 'stock')::int, 0)
              + direction * item.quantity
          )
        )
      );

      update public.products
      set variants = new_variants,
          stock = (
            select coalesce(sum((v ->> 'stock')::int), 0)
            from jsonb_array_elements(new_variants) v
          )
      where id = item.product_id;
    else
      update public.products
      set stock = greatest(0, stock + direction * item.quantity)
      where id = item.product_id;
    end if;
  end loop;

  return new;
end;
$$;

-- Dropped by the name it actually carries, so the old and the new trigger cannot
-- both end up firing and moving stock twice.
drop trigger if exists handle_order_confirmed     on public.orders;
drop trigger if exists on_order_confirmed         on public.orders;
drop trigger if exists on_order_stock_movement    on public.orders;
create trigger on_order_stock_movement
  after update of status on public.orders
  for each row execute function public.handle_order_stock_movement();

drop function if exists public.handle_order_confirmed() cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Stock RPCs — dropped
--
-- The trigger above owns stock, so no client ever needs to ask for a movement.
-- Both of these were SECURITY DEFINER with no authorization check and reachable
-- by any caller holding the anon key — which ships in the browser bundle. An RPC
-- that moves inventory on request is an entry point worth not having: the safest
-- version of it is the one that does not exist.
--
-- Signatures are resolved from the catalogue rather than assumed, so the drop
-- does not depend on getting the argument list right.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('restore_stock', 'decrement_stock')
  loop
    execute format('drop function if exists %s cascade', f.signature);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_product_sales()
--
-- Counts paid orders only, so "best sellers" reflects what customers actually
-- bought rather than what they put in a basket and abandoned.
--
-- Callable by anonymous visitors on purpose: it powers the public home page. It
-- exposes per-product unit counts and nothing else — no customer, order or
-- revenue data.
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
-- 7. handle_new_user() — creates the profile row on signup
--
-- ON CONFLICT DO NOTHING keeps it safe to re-run against a database whose
-- profiles already exist.
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Catch-all: pin search_path on every SECURITY DEFINER function
--
-- The functions above set it explicitly. This sweeps up anything else in the
-- schema, now or later, rather than depending on a hand-kept list being complete
-- — which is exactly the assumption a hardening step should not make.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (p.proconfig is null or not (p.proconfig::text like '%search_path%'))
  loop
    execute format('alter function %s set search_path = public', f.signature);
  end loop;
end $$;
