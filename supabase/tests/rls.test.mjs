/**
 * Row Level Security and stock-invariant tests.
 *
 * These cover the rules that cannot be enforced in the frontend: a customer must
 * not be able to promote themselves to admin, or declare their own order paid,
 * and stock must move correctly in both directions.
 *
 * Run against a throwaway PostgreSQL database:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
 *
 * CI provisions that database as a service container. The tests are destructive:
 * they drop and recreate the `public` schema, so never point DATABASE_URL at a
 * database you care about — and never at your Supabase project.
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  console.error('These tests need a throwaway PostgreSQL database — see the header of this file.');
  process.exit(1);
}

if (/supabase\.(co|in)/.test(DATABASE_URL)) {
  console.error('Refusing to run: DATABASE_URL points at a Supabase project.');
  console.error('These tests drop the public schema. Use a throwaway database.');
  process.exit(1);
}

const MIGRATION = 'supabase/migrations/0001_authorization_and_stock_invariants.sql';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ADMIN_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';
const PRODUCT_ID = '44444444-4444-4444-4444-444444444444';
const UNPAID_ORDER_ID = '55555555-5555-5555-5555-555555555555';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`);
}

const sql = (p) => readFileSync(join(REPO, p), 'utf8');
const firstLine = (e) => String(e.message).split('\n')[0];

const client = new pg.Client({ connectionString: DATABASE_URL });

/** Run `fn` as an authenticated PostgREST request would, for the given user. */
async function asUser(uid, fn) {
  await client.query('set role authenticated');
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  try {
    return await fn();
  } finally {
    await client.query('reset role');
    await client.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Returns the error message if the statement was rejected, or null if it went through. */
async function rejects(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return firstLine(e);
  }
}

const stock = async () =>
  (await client.query('select stock from public.products where id = $1', [PRODUCT_ID])).rows[0].stock;

async function main() {
  await client.connect();
  await client.query(`set client_encoding to 'UTF8'`);

  console.log('\nSetup: fresh schema');
  await client.query('drop schema if exists public cascade; create schema public;');
  await client.query('drop schema if exists auth cascade; drop schema if exists storage cascade;');
  await client.query(sql('supabase/tests/stubs.sql'));
  await client.query(sql('supabase-schema.sql'));
  await client.query(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
    grant execute on all functions in schema public to anon, authenticated;
  `);
  check('supabase-schema.sql applies to an empty database', true);

  await client.query(sql('supabase-schema.sql'));
  check('supabase-schema.sql is idempotent', true);

  // Re-running the migration must be safe: it is the recovery path when a paste
  // into the SQL editor half-fails, and it is what makes the file safe to keep.
  const migrationErr = await rejects(async () => {
    await client.query(sql(MIGRATION));
    await client.query(sql(MIGRATION));
  });
  check('the migration can be re-applied safely', migrationErr === null, migrationErr ?? '');

  console.log('\nObjects an older database carries');
  // Policies are OR'd and triggers stack, so anything the migration fails to
  // name survives beside the new rule and keeps granting. These are the shapes a
  // database built by an earlier version actually holds: recreate them, re-run
  // the migration, and prove they are gone rather than trusting that the names
  // were guessed right.
  await client.query(`
    create policy "Users can confirm their own orders"
      on public.orders for update
      using      ((user_id = auth.uid()) and (status = 'pending'))
      with check ((user_id = auth.uid()) and (status = 'processing'));

    create policy "Admin can delete orders"
      on public.orders for delete
      using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

    create or replace function public.restore_stock(order_id_param uuid)
    returns void language plpgsql security definer as $fn$ begin end $fn$;

    create or replace function public.decrement_stock(items jsonb)
    returns void language plpgsql security definer as $fn$ begin end $fn$;

    create or replace function public.handle_order_confirmed()
    returns trigger language plpgsql as $fn$ begin return new; end $fn$;

    create trigger handle_order_confirmed
      after update on public.orders
      for each row execute function public.handle_order_confirmed();
  `);

  await client.query(sql(MIGRATION));

  const bypass = await client.query(`
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders'
      and policyname = 'Users can confirm their own orders'
  `);
  check('the customer order-confirmation policy is removed', bypass.rowCount === 0);

  const legacyFns = await client.query(`
    select p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('restore_stock', 'decrement_stock')
  `);
  check('the stock RPCs are removed', legacyFns.rowCount === 0, legacyFns.rows.map((r) => r.proname).join(', '));

  const orderTriggers = await client.query(`
    select t.tgname from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    where c.relname = 'orders' and not t.tgisinternal
  `);
  check(
    'exactly one stock trigger is left on orders',
    orderTriggers.rowCount === 1 && orderTriggers.rows[0]?.tgname === 'on_order_stock_movement',
    orderTriggers.rows.map((r) => r.tgname).join(', ') || 'none'
  );

  const deletePolicies = await client.query(`
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'orders' and cmd = 'DELETE'
  `);
  check(
    'the delete rule is expressed once, not twice',
    deletePolicies.rowCount === 1,
    deletePolicies.rows.map((r) => r.policyname).join(', ')
  );

  console.log('\nSignup and admin bootstrap');
  await client.query(`insert into auth.users (id, email) values ($1,'user@test.local'), ($2,'admin@test.local')`, [USER_ID, ADMIN_ID]);
  const created = (await client.query('select count(*)::int n from public.profiles where id in ($1,$2)', [USER_ID, ADMIN_ID])).rows[0].n;
  check('handle_new_user() creates a profile on signup', created === 2, `${created}/2 profiles`);

  // The documented bootstrap: promote the first admin from the SQL editor, where
  // there is no signed-in user and auth.uid() is null.
  const bootErr = await rejects(() =>
    client.query(`update public.profiles set role='admin' where id=$1`, [ADMIN_ID])
  );
  check('the first admin can be promoted from the SQL editor', bootErr === null, bootErr ?? '');

  console.log('\nPrivilege escalation');
  await asUser(USER_ID, () => rejects(() =>
    client.query(`update public.profiles set role='admin' where id=$1`, [USER_ID])
  ));
  let role = (await client.query('select role from public.profiles where id=$1', [USER_ID])).rows[0].role;
  check('a customer cannot promote themselves to admin', role === 'user', `role is '${role}'`);

  await asUser(ADMIN_ID, () =>
    client.query(`update public.profiles set role='admin' where id=$1`, [USER_ID])
  );
  role = (await client.query('select role from public.profiles where id=$1', [USER_ID])).rows[0].role;
  check('an admin can promote another user', role === 'admin', `role is '${role}'`);
  await client.query(`update public.profiles set role='user' where id=$1`, [USER_ID]);

  console.log('\nOrder creation');
  const paidErr = await asUser(USER_ID, () => rejects(() =>
    client.query(`insert into public.orders (user_id,status,total) values ($1,'processing',999)`, [USER_ID])
  ));
  check('a customer cannot create an order already marked paid', paidErr !== null, paidErr ?? 'it was accepted');

  const unpaidErr = await asUser(USER_ID, () => rejects(() =>
    client.query(`insert into public.orders (id,user_id,status,total) values ($1,$2,'awaiting_payment',999)`, [ORDER_ID, USER_ID])
  ));
  check('a customer can create an unpaid order', unpaidErr === null, unpaidErr ?? '');

  const otherErr = await asUser(USER_ID, () => rejects(() =>
    client.query(`insert into public.orders (user_id,status,total) values ($1,'awaiting_payment',999)`, [ADMIN_ID])
  ));
  check('a customer cannot create an order for someone else', otherErr !== null, otherErr ?? 'it was accepted');

  const updErr = await asUser(USER_ID, () => rejects(() =>
    client.query(`update public.orders set status='processing' where id=$1`, [ORDER_ID])
  ));
  const afterStatus = (await client.query('select status from public.orders where id=$1', [ORDER_ID])).rows[0].status;
  check('a customer cannot mark their own order as paid', afterStatus === 'awaiting_payment', updErr ?? `status is '${afterStatus}'`);

  console.log('\nStock movements');
  await client.query(
    `insert into public.products (id,name,price,category,stock) values ($1,'Test Laptop',100,'Laptop',10)`,
    [PRODUCT_ID]
  );
  // The same product twice under different variants. This is the case that
  // needs aggregation: `update ... from` applies one source row per target only,
  // so without it these two lines would consume stock once between them.
  await client.query(
    `insert into public.order_items (order_id,product_id,quantity,unit_price,variant_index)
     values ($1,$2,2,100,0), ($1,$2,3,100,1)`,
    [ORDER_ID, PRODUCT_ID]
  );

  await client.query(`update public.orders set status='processing' where id=$1`, [ORDER_ID]);
  check('two variants of one product decrement 2+3 (10 → 5)', (await stock()) === 5, `stock ${await stock()}`);

  await client.query(`update public.orders set status='shipped' where id=$1`, [ORDER_ID]);
  check('processing → shipped does not move stock again', (await stock()) === 5, `stock ${await stock()}`);

  await client.query(`update public.orders set status='cancelled' where id=$1`, [ORDER_ID]);
  check('cancelling a paid order restores stock (5 → 10)', (await stock()) === 10, `stock ${await stock()}`);

  await client.query(`insert into public.orders (id,user_id,status,total) values ($1,$2,'awaiting_payment',100)`, [UNPAID_ORDER_ID, USER_ID]);
  await client.query(`insert into public.order_items (order_id,product_id,quantity,unit_price) values ($1,$2,4,100)`, [UNPAID_ORDER_ID, PRODUCT_ID]);
  await client.query(`update public.orders set status='cancelled' where id=$1`, [UNPAID_ORDER_ID]);
  check('cancelling an order that never paid invents no stock (stays 10)', (await stock()) === 10, `stock ${await stock()}`);

  console.log('\nPer-variant stock');
  // Variants hold their own stock and products.stock is their sum — the same rule
  // the admin dashboard applies on save. A trigger that moved only products.stock
  // would be silently undone the next time a product was saved.
  const VARIANT_PRODUCT = '66666666-6666-6666-6666-666666666666';
  const VARIANT_ORDER = '77777777-7777-7777-7777-777777777777';
  await client.query(
    `insert into public.products (id,name,price,category,stock,variants)
     values ($1,'Test Phone',500,'Smartphone',10,
             '[{"color":"Black","stock":6,"images":[]},{"color":"White","stock":4,"images":[]}]'::jsonb)`,
    [VARIANT_PRODUCT]
  );
  await client.query(
    `insert into public.orders (id,user_id,status,total) values ($1,$2,'awaiting_payment',2500)`,
    [VARIANT_ORDER, USER_ID]
  );
  await client.query(
    `insert into public.order_items (order_id,product_id,quantity,unit_price,variant_index)
     values ($1,$2,2,500,0), ($1,$2,3,500,1)`,
    [VARIANT_ORDER, VARIANT_PRODUCT]
  );

  const variantState = async () => {
    const r = await client.query(
      `select stock, variants -> 0 ->> 'stock' as v0, variants -> 1 ->> 'stock' as v1
       from public.products where id = $1`,
      [VARIANT_PRODUCT]
    );
    return { stock: r.rows[0].stock, v0: Number(r.rows[0].v0), v1: Number(r.rows[0].v1) };
  };

  await client.query(`update public.orders set status='processing' where id=$1`, [VARIANT_ORDER]);
  let vs = await variantState();
  check(
    'each variant is decremented on its own (Black 6→4, White 4→1)',
    vs.v0 === 4 && vs.v1 === 1,
    `Black ${vs.v0}, White ${vs.v1}`
  );
  check('products.stock is recomputed as the sum of variants (10 → 5)', vs.stock === 5, `stock ${vs.stock}`);

  await client.query(`update public.orders set status='cancelled' where id=$1`, [VARIANT_ORDER]);
  vs = await variantState();
  check(
    'cancelling restores each variant and the total (Black 6, White 4, stock 10)',
    vs.v0 === 6 && vs.v1 === 4 && vs.stock === 10,
    `Black ${vs.v0}, White ${vs.v1}, stock ${vs.stock}`
  );

  console.log('\nAttack surface');
  const restore = await client.query(`select proname from pg_proc where proname='restore_stock'`);
  check('no restore_stock() RPC is exposed', restore.rowCount === 0);

  const mutable = await client.query(`
    select p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (p.proconfig is null or not (p.proconfig::text like '%search_path%'))
  `);
  check(
    'every SECURITY DEFINER function pins search_path',
    mutable.rowCount === 0,
    mutable.rows.map((r) => r.proname).join(', ')
  );

  const rlsOff = await client.query(`
    select tablename from pg_tables
    where schemaname='public' and rowsecurity = false
  `);
  check(
    'RLS is enabled on every public table',
    rlsOff.rowCount === 0,
    rlsOff.rows.map((r) => r.tablename).join(', ')
  );

  await client.end();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? `: ${f.detail}` : ''}`));
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error('\nTest run failed:', e.message);
  try {
    await client.end();
  } catch {
    // connection already gone
  }
  process.exit(1);
});
