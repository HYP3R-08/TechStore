import type { Order } from '../../../lib/supabase';

/**
 * What the orders query actually returns.
 *
 * Narrower than `Order` on purpose: the dashboard asks for only the columns it
 * renders, and `profiles` is joined in separately rather than being a column on
 * the table. Omitting the nested keys keeps the type honest about that instead
 * of claiming fields the query never selected.
 */
export interface OrderWithDetails extends Omit<Order, 'order_items'> {
  profiles?: { id: string; email: string; full_name: string | null };
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    products?: { name: string } | null;
  }>;
}

export const CATEGORIES = ['Laptop', 'Components', 'Monitor', 'Smartphone', 'Gaming', 'Others'];

export const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  // Same meaning as awaiting_payment; only appears on rows from older versions.
  pending: 'Awaiting payment',
  processing: 'Paid — to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Statuses that mean the customer has actually paid. */
export const PAID_STATUSES = ['processing', 'shipped', 'delivered'];
