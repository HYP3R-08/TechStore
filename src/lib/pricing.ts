/**
 * Order pricing rules — the client copy.
 *
 * Deliberately duplicated in supabase/functions/_shared/pricing.ts. The browser
 * needs these to show a total before checkout, and an Edge Function bundle
 * cannot import from src/.
 *
 * This copy decides only what is *displayed*. What is actually charged is
 * computed server-side from the database, so a tampered client can mislead its
 * own user and nothing else.
 *
 * Keep in sync with: supabase/functions/_shared/pricing.ts
 */

export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_COST = 15;

export function shippingFor(subtotal: number): number {
  return subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

/** Amounts a customer is charged: always two decimals, as on a receipt. */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Round figures in prose, where "100 €" reads better than "100,00 €".
 * For anything a customer actually pays, use formatEur.
 */
export function formatEurCompact(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}
