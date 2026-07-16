# TechStore

[![CI](https://github.com/HYP3R-08/ecommerce1/actions/workflows/ci.yml/badge.svg)](https://github.com/HYP3R-08/ecommerce1/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

A full-stack e-commerce demo for technology products: **React + Vite + TypeScript** on the front end, **Supabase** (PostgreSQL, Auth, Edge Functions) behind it, and **Stripe Checkout** for payments.

🔗 **Live demo:** https://techstore-murex-beta.vercel.app/

> Browse, search, cart, Stripe checkout, order history — plus an admin dashboard gated by database-level authorization.

> [!NOTE]
> The initial UI scaffolding was generated with Figma Make. The data model, the Row Level Security policies, the Stripe integration and the Edge Functions are hand-written — that is the part worth reading.

---

## Features

**Storefront**
- Product catalogue with category filters, sorting, and multi-term search across name, brand and description
- Product pages with an image gallery and per-colour variants, each with its own stock
- Featured products and a *New Arrivals* section
- Cart persisted in `localStorage`, reconciled against live prices and stock on load
- Stripe Checkout, with an order confirmation page that waits for the real payment result
- Light / dark theme

**Accounts**
- Email/password authentication (Supabase Auth)
- Password reset flow
- Order history with a delivery status tracker

**Admin dashboard** (admin role only)
- Product CRUD with image upload, colour variants and stock management
- Order fulfilment: ship with a tracking link, cancel, mark delivered
- User list with role management

**Backend**
- PostgreSQL schema with Row Level Security separating customer and admin access
- Stripe Checkout sessions created server-side in an Edge Function, priced from the database
- A signed Stripe webhook is the only thing that can mark an order paid
- Shipping notification email (Resend) sent from an admin-only Edge Function

---

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, TypeScript (strict), Vite 6, React Router 7 |
| UI | Tailwind CSS 4, lucide-react, sonner |
| State | React Context (auth, cart, theme), URL search params for filters |
| Backend | Supabase — PostgreSQL, Auth, Edge Functions (Deno) |
| Payments | Stripe Checkout + webhooks |
| Email | Resend |
| Tests | Node + `pg` against a throwaway PostgreSQL, run in CI |
| Deployment | Vercel |

---

## Architecture

```
React (Vite SPA)
   │
   ├── supabase-js ──────► Supabase Auth + PostgreSQL
   │                        every query filtered by Row Level Security
   │
   └── POST create-checkout-session (Edge Function)
              │  reads prices and stock from the DB
              │  creates the order as `awaiting_payment`
              └──────────► Stripe Checkout
                                │
                                │  customer pays
                                ▼
                     POST stripe-webhook (Edge Function)
                          verifies the Stripe signature
                          order ──► `processing`, stock decremented by trigger
```

The data model (`profiles`, `products`, `orders`, `order_items`) is protected by Row Level Security, with an `is_admin()` check gating every admin operation. The browser never decides a price, a total, or whether an order was paid.

---

## Security notes

- **The Supabase anon key is public by design.** It ships in the browser bundle, and that is fine: access is enforced server-side by Row Level Security, not by hiding the key. Hiding it would protect nothing; RLS protects everything.
- **The Stripe secret key** lives only in the Edge Function environment and never reaches the client bundle.
- **Prices are never taken from the request.** `create-checkout-session` receives product ids and quantities and reads everything else from the database, so a tampered client cannot change what it is charged.
- **A redirect is not a payment.** Only the signed Stripe webhook can move an order to `processing`. The success page polls for that result rather than asserting it.
- **Stock is a database invariant.** One trigger owns it in both directions, keyed on the status transition, so it cannot be moved out of band by a client.
- **Role changes are blocked at the database.** An explicit `WITH CHECK` plus a trigger stop a customer from promoting themselves to admin — see [`supabase/tests/rls.test.mjs`](supabase/tests/rls.test.mjs), which asserts exactly that.

---

## Getting started

**Requirements:** Node 20+, a free [Supabase](https://supabase.com) project, and a [Stripe](https://stripe.com) account in test mode.

```bash
git clone https://github.com/HYP3R-08/ecommerce1.git
cd ecommerce1
npm install
cp .env.example .env      # fill in your Supabase URL and anon key
npm run dev
```

### 1. Database

Run [`supabase-schema.sql`](supabase-schema.sql) once in the Supabase SQL editor (**Dashboard → SQL Editor → New Query**). It creates the tables, the RLS policies, the triggers and the storage bucket, and seeds a demo catalogue.

Then sign up through the app and promote yourself, using your own email:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

> Upgrading a database created by an older version of the schema? Run
> [`supabase/migrations/0001_authorization_and_stock_invariants.sql`](supabase/migrations/0001_authorization_and_stock_invariants.sql) instead — it is idempotent.

### 2. Edge Functions

```bash
supabase link --project-ref <your-project-ref>

supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:5173"

supabase functions deploy create-checkout-session
supabase functions deploy send-shipping-email
supabase functions deploy stripe-webhook
```

`supabase/config.toml` already declares that `stripe-webhook` skips JWT verification — Stripe has no Supabase token, and its signature is the authentication.

### 3. Stripe webhook

In the Stripe dashboard, add an endpoint pointing at:

```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

subscribed to `checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`.
Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

Without this endpoint paid orders stay `awaiting_payment` forever — the webhook is the only thing that confirms a payment.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:db` | Row Level Security and stock tests (needs `DATABASE_URL`) |

The RLS tests are destructive — they drop and rebuild the `public` schema. Point `DATABASE_URL` at a throwaway database, never at your Supabase project. CI runs them against a disposable PostgreSQL service on every push.

---

## Notes and trade-offs

- **Search and filtering run in the browser.** The catalogue is small enough to load in one query, so filtering locally is instant and costs no round trip. Past a few hundred products the right move is server-side `.ilike()` or a Postgres full-text index, with `.range()` for pagination.
- **Pricing rules are duplicated** in `src/lib/pricing.ts` and `supabase/functions/_shared/pricing.ts`. An Edge Function bundle cannot import from `src/`. The client copy only decides what is *displayed*; the server copy decides what is *charged*.
- **Overselling under concurrency is not handled.** Two customers buying the last unit at the same instant can both check out. A real shop solves this with stock reservations at checkout; here the trigger clamps at zero and the admin sees it.

---

## License

Released under the [MIT License](LICENSE).
