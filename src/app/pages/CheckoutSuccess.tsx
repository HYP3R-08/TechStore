import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../lib/CartContext';
import { CheckCircle, Clock, Package, Loader2, AlertCircle } from 'lucide-react';

/**
 * Waits for the Stripe webhook to confirm the order, then reports what actually
 * happened.
 *
 * This page only reads. Landing on it means the browser followed a redirect,
 * which is not evidence that anything was paid — the webhook is the one thing
 * that can confirm a payment, so this page reflects that state rather than
 * asserting it.
 *
 * Confirmation normally lands in well under a second, but a webhook is
 * asynchronous, so 'still working on it' is a real outcome and says so instead
 * of claiming success.
 */

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 25000;
const PAID_STATUSES = ['processing', 'shipped', 'delivered'];

type State = 'checking' | 'confirmed' | 'pending' | 'cancelled' | 'missing';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { clear } = useCart();

  const [state, setState] = useState<State>(orderId ? 'checking' : 'missing');
  const cartCleared = useRef(false);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const poll = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled) return;

      // RLS only returns the order to the customer who owns it, so "not found"
      // covers both an unknown id and someone else's order.
      if (error || !data) {
        setState('missing');
        return;
      }

      if (PAID_STATUSES.includes(data.status)) {
        if (!cartCleared.current) {
          cartCleared.current = true;
          clear();
        }
        setState('confirmed');
        return;
      }

      if (data.status === 'cancelled') {
        setState('cancelled');
        return;
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setState('pending');
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, clear]);

  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-12 max-w-md w-full text-center shadow-sm">
        {state === 'checking' && (
          <>
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-9 h-9 animate-spin text-neutral-400" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-3">
              Confirming your payment
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              This only takes a moment — please don't close this page.
            </p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="w-20 h-20 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-3">
              Payment confirmed
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Your order is confirmed and is being prepared.
            </p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-3">
              Still processing
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Your payment is taking longer than usual to confirm. Nothing is lost —
              the status updates on its own, and you can follow it from your account.
            </p>
          </>
        )}

        {state === 'cancelled' && (
          <>
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-neutral-400" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-3">
              Payment not completed
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              This order was cancelled and you have not been charged. Your cart is
              still there if you'd like to try again.
            </p>
          </>
        )}

        {state === 'missing' && (
          <>
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-neutral-400" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-3">
              Order not found
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              We couldn't find this order. If you completed a payment, it will appear
              in your account.
            </p>
          </>
        )}

        {shortId && state !== 'missing' && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-3">
            Order #{shortId}
          </p>
        )}

        <div className="space-y-3 mt-8">
          <Link
            to="/account"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <Package className="w-4 h-4" />
            Track your order
          </Link>
          <Link
            to="/products"
            className="flex items-center justify-center w-full px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white text-sm rounded-full hover:border-black dark:hover:border-white transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
