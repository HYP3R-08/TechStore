/**
 * Stripe webhook — the only thing allowed to declare an order paid.
 *
 * A browser redirect is a UI hint, not a payment event: the customer can close
 * the tab before it happens (paid, never confirmed) or open the success URL
 * without paying at all (confirmed, never paid). Only a signed webhook knows
 * what really happened, so confirmation lives here and nowhere else.
 *
 * Deploy WITHOUT JWT verification — Stripe has no Supabase token, and the
 * signature is the authentication:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Idempotency: Stripe retries webhooks, and a replay must not decrement stock
 * twice. Rather than tracking event ids, each update is guarded on the status it
 * expects to move away from, so a replay matches zero rows and the stock trigger
 * never fires again.
 */
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { adminClient } from '../_shared/auth.ts';

const UNPAID = ['awaiting_payment', 'pending'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — refusing to trust this request');
    return new Response('Webhook not configured', { status: 500 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    // The raw body is required: any reserialisation breaks the signature.
    // Deno needs the async variant — the sync one uses Node crypto internals.
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (error) {
    console.error('Invalid webhook signature', error);
    return new Response('Invalid signature', { status: 400 });
  }

  const db = adminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) {
          console.error('checkout.session.completed without an orderId', session.id);
          break;
        }

        // A completed session is not necessarily a paid one: delayed payment
        // methods complete the session first and pay later.
        if (session.payment_status !== 'paid') {
          console.log(`Session ${session.id} completed but payment_status=${session.payment_status}`);
          break;
        }

        const { data, error } = await db
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', orderId)
          .in('status', UNPAID)
          .select('id');

        if (error) throw error;
        console.log(
          data?.length
            ? `Order ${orderId} marked processing`
            : `Order ${orderId} was already handled — replay ignored`
        );
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        const { error } = await db
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', orderId)
          .in('status', UNPAID);
        if (error) throw error;
        break;
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        // Only ever cancels an order that never paid, so no stock is credited
        // back for inventory that was never taken.
        const { error } = await db
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId)
          .in('status', UNPAID);
        if (error) throw error;
        console.log(`Order ${orderId} cancelled (${event.type})`);
        break;
      }

      default:
        // Stripe sends more than we subscribe to; acknowledge and move on.
        break;
    }
  } catch (error) {
    // A non-2xx tells Stripe to retry, which is what we want for a transient
    // database failure. The guards above make the retry safe.
    console.error(`Failed to handle ${event.type}`, error);
    return new Response('Handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
