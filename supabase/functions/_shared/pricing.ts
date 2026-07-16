/**
 * Order pricing rules — the server-side copy, and the authoritative one.
 *
 * Deliberately duplicated in src/lib/pricing.ts: the browser needs these to show
 * a total before checkout, and an Edge Function bundle cannot reach into src/.
 * The two files must agree; this one decides what is actually charged, the
 * client copy only decides what is displayed.
 *
 * Keep in sync with: src/lib/pricing.ts
 */

export const CURRENCY = 'eur';
export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_COST = 15;

export function shippingFor(subtotal: number): number {
  return subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

/** Money is handled in integer cents to avoid float drift on the way to Stripe. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
