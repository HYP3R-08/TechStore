import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  color: string;
  images: string[];
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  images: string[];
  variants: ProductVariant[];
  description: string;
  featured: boolean;
  stock: number;
  brand: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface ShippingAddress {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
}

/**
 * Order status lifecycle:
 *
 *   awaiting_payment  created at checkout, customer sent to Stripe, NOT paid yet
 *   processing        the Stripe webhook confirmed payment — stock consumed here
 *   shipped           dispatched, tracking_url set
 *   delivered         completed
 *   cancelled         stock credited back if it had been consumed
 *
 * 'pending' means the same as awaiting_payment and is never assigned to a new
 * order; it is kept in the union because older rows still carry it.
 */
export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  tracking_url?: string | null;
  shipping_address?: ShippingAddress | null;
  created_at: string;
  // Populated only when a query asks for the nested rows.
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  variant_index?: number | null;
  products?: Product;
}

export interface CartItem extends Product {
  quantity: number;
  variantIndex?: number | null;
}