# TechStore

A full-stack e-commerce web application for technology products, built with **React + Vite + TypeScript** on the frontend and **Supabase** (PostgreSQL, Auth, Edge Functions) on the backend, with **Stripe Checkout** for payments.

🔗 **Live demo:** https://techstore-murex-beta.vercel.app/

> A complete e-commerce experience — browse, search, cart, secure checkout, order history — plus a role-protected admin dashboard for managing products and orders.

---

## Features

**Storefront**
- Product catalogue with categories, search and filtering
- Product detail pages with image gallery and stock awareness
- Featured products and a dedicated *New Arrivals* section
- Shopping cart with persistent state
- Secure checkout via Stripe, with an order-confirmation (success) page
- Light / dark theme

**Accounts & Auth**
- Email/password authentication (Supabase Auth)
- Forgot-password and password-reset flows
- Account area with personal order history

**Admin dashboard** (admin role only)
- Product CRUD (create, update, delete) with inventory/stock management
- Order overview and status updates
- Sales/data visualisations (Recharts)

**Backend & payments**
- PostgreSQL data model with **Row Level Security (RLS)** policies separating customer and admin access
- Stripe Checkout session creation handled server-side via a Supabase **Edge Function**
- Automated shipping/confirmation email via a second Edge Function

---

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, TypeScript, Vite 6, React Router 7 |
| UI / styling | Tailwind CSS 4, Radix UI, MUI, lucide-react, Motion |
| State / forms | React Context, react-hook-form |
| Charts | Recharts |
| Backend | Supabase — PostgreSQL, Auth, Edge Functions (Deno) |
| Payments | Stripe Checkout (`@stripe/stripe-js`) |
| Deployment | Vercel |

---

## Architecture

```
React (Vite SPA)
   |  Supabase JS client  -->  Supabase Auth + PostgreSQL (RLS)
   |  fetch --> Edge Function: create-checkout-session --> Stripe Checkout
   +- Stripe redirects back --> /checkout/success
                                     |
                          Edge Function: send-shipping-email
```

The data model (`profiles`, `products`, `orders`, `order_items`) is protected by Row Level Security, with an `is_admin()` check gating every admin operation. Payment logic runs entirely server-side: the **Stripe secret key never reaches the browser** and lives only in the Edge Function environment.

---

## Security notes

- The Supabase **anon key is public by design** — access is enforced server-side through **Row Level Security**, not by hiding the key.
- The **Stripe secret key** is kept exclusively in the Edge Function environment and is never exposed to the client bundle.

---

## License

Released under the [MIT License](LICENSE).
