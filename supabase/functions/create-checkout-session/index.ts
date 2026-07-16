/**
 * Creates the order and the Stripe Checkout session.
 *
 * The rule this function exists to enforce: the client declares intent, the
 * server establishes the facts. The browser says which products and how many —
 * nothing else. Prices, stock, shipping and the order total are all read or
 * computed here, from the database.
 *
 * That matters because the cart lives in localStorage, which the customer owns.
 * Anything taken from the request body is a number they chose.
 */
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { z } from 'https://esm.sh/zod@3.24.1';
import { corsHeaders, preflight, json, fail } from '../_shared/cors.ts';
import { adminClient, getCaller } from '../_shared/auth.ts';
import { CURRENCY, shippingFor, toCents } from '../_shared/pricing.ts';

const MAX_QUANTITY_PER_LINE = 20;
const MAX_LINES = 50;

const addressSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(320),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).nullable().optional(),
    postal_code: z.string().trim().min(1).max(20),
    country: z.string().trim().length(2),
  }),
});

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
        variantIndex: z.number().int().min(0).nullable().optional(),
      })
    )
    .min(1)
    .max(MAX_LINES),
  shippingAddress: addressSchema,
});

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  // success_url is built from the allow-listed Origin, never from the request
  // body: a caller-supplied origin would let them choose where Stripe sends the
  // customer next. corsHeaders() has already resolved it, so reuse that decision.
  const origin = corsHeaders(req)['Access-Control-Allow-Origin'];
  if (!origin) return fail(req, 'Origin not allowed', 403);

  const caller = await getCaller(req);
  if (!caller) return fail(req, 'You must be signed in to check out', 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(req, 'Invalid checkout request', 400, parsed.error.flatten());
  }
  const { items, shippingAddress } = parsed.data;

  const db = adminClient();

  // Aggregate per product before checking stock: the same product can appear on
  // several lines under different variants, and every line consumes stock.
  const wanted = new Map<string, number>();
  for (const item of items) {
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }

  const { data: products, error: productsError } = await db
    .from('products')
    .select('id, name, price, image_url, stock')
    .in('id', [...wanted.keys()]);

  if (productsError) return fail(req, 'Could not load products', 500, productsError);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  for (const [productId, quantity] of wanted) {
    const product = byId.get(productId);
    if (!product) return fail(req, 'One of the products is no longer available', 409);
    if (product.stock < quantity) {
      return fail(req, `Not enough stock for ${product.name}`, 409);
    }
  }

  // Prices come from the database, never from the request.
  let subtotal = 0;
  const line_items = items.map((item) => {
    const product = byId.get(item.productId)!;
    subtotal += product.price * item.quantity;
    return {
      price_data: {
        currency: CURRENCY,
        product_data: {
          name: product.name,
          images: product.image_url ? [product.image_url] : [],
        },
        unit_amount: toCents(product.price),
      },
      quantity: item.quantity,
    };
  });

  const shipping = shippingFor(subtotal);
  if (shipping > 0) {
    line_items.push({
      price_data: {
        currency: CURRENCY,
        product_data: { name: 'Shipping', images: [] },
        unit_amount: toCents(shipping),
      },
      quantity: 1,
    });
  }
  const total = subtotal + shipping;

  // The order is created unpaid. Only the Stripe webhook may move it forward, so
  // a customer who never pays can never produce a real order.
  const orderId = crypto.randomUUID();
  const { error: orderError } = await db.from('orders').insert({
    id: orderId,
    user_id: caller.id,
    status: 'awaiting_payment',
    total,
    shipping_address: shippingAddress,
  });
  if (orderError) return fail(req, 'Could not create the order', 500, orderError);

  const { error: itemsError } = await db.from('order_items').insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: byId.get(item.productId)!.price,
      variant_index: item.variantIndex ?? null,
    }))
  );
  if (itemsError) {
    await db.from('orders').delete().eq('id', orderId);
    return fail(req, 'Could not create the order', 500, itemsError);
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: caller.email ?? undefined,
      success_url: `${origin}/checkout/success?order_id=${orderId}`,
      cancel_url: `${origin}/cart`,
      // The webhook reads this back to learn which order was paid.
      metadata: { orderId },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!session.url) throw new Error('Stripe returned a session without a URL');

    return json(req, { url: session.url, orderId });
  } catch (error) {
    // Do not leave an orphaned order behind if Stripe never accepted it.
    await db.from('order_items').delete().eq('order_id', orderId);
    await db.from('orders').delete().eq('id', orderId);
    return fail(req, 'Could not reach the payment provider', 502, error);
  }
});
