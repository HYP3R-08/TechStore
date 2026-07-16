import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useCart, cartKey } from '../../lib/CartContext';
import { formatEur, FREE_SHIPPING_THRESHOLD } from '../../lib/pricing';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const COUNTRIES = [
  { code: 'IT', label: 'Italy' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'BE', label: 'Belgium' },
];

/** Turns an Edge Function failure into the message the function actually sent. */
async function messageFor(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body && typeof body.error === 'string') return body.error;
  }
  return fallback;
}

export function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: cartItems, subtotal, shipping, total } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ShippingForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IT',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }
    setForm(f => ({ ...f, email: f.email || user.email || '' }));
  }, [user, cartItems.length, navigate]);

  const update = (field: keyof ShippingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  /**
   * Sends only what we are entitled to decide: which products, how many, and
   * where to ship them. The Edge Function reads the prices from the database,
   * checks stock, computes the total and creates the order — so nothing here can
   * change what gets charged.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          variantIndex: item.variantIndex ?? null,
        })),
        shippingAddress: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone || null,
          email: form.email,
          address: {
            line1: form.line1,
            line2: form.line2 || null,
            city: form.city,
            state: form.state || null,
            postal_code: form.postalCode,
            country: form.country,
          },
        },
      },
    });

    if (error || !data?.url) {
      toast.error(await messageFor(error, 'Could not start the payment. Please try again.'));
      setSubmitting(false);
      return;
    }

    // The cart is cleared once the webhook has confirmed the payment, not here:
    // the customer may still abandon Stripe and come back to it.
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </Link>

        <h1 className="text-4xl font-light tracking-tight text-black dark:text-white mb-12">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-10">
            {/* Contact */}
            <div>
              <h2 className="text-lg font-light tracking-tight text-black dark:text-white mb-5 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    required
                    value={form.firstName}
                    onChange={update('firstName')}
                    placeholder="Mario"
                  />
                  <Input
                    label="Last Name"
                    required
                    value={form.lastName}
                    onChange={update('lastName')}
                    placeholder="Rossi"
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  placeholder="mario@example.com"
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="+39 333 1234567"
                />
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <h2 className="text-lg font-light tracking-tight text-black dark:text-white mb-5 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                Shipping Address
              </h2>
              <div className="space-y-4">
                <Input
                  label="Address"
                  required
                  value={form.line1}
                  onChange={update('line1')}
                  placeholder="Via Roma 1"
                />
                <Input
                  label="Apartment, suite, etc. (optional)"
                  value={form.line2}
                  onChange={update('line2')}
                  placeholder="Interno 4"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    required
                    value={form.city}
                    onChange={update('city')}
                    placeholder="Milano"
                  />
                  <Input
                    label="Postal Code"
                    required
                    value={form.postalCode}
                    onChange={update('postalCode')}
                    placeholder="20100"
                  />
                </div>
                <Input
                  label="Province / State (optional)"
                  value={form.state}
                  onChange={update('state')}
                  placeholder="MI"
                />
                <div className="space-y-2">
                  <label className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide">Country</label>
                  <select
                    value={form.country}
                    onChange={update('country')}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span>
                : 'Continue to Payment'}
            </Button>
          </form>

          {/* Order summary */}
          <div>
            <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl sticky top-24">
              <h2 className="text-lg font-light tracking-tight text-black dark:text-white mb-5">Order Summary</h2>

              <div className="space-y-4 mb-5">
                {cartItems.map(item => (
                  <div key={cartKey(item.id, item.variantIndex)} className="flex items-center gap-3">
                    <img
                      src={item.variantIndex != null ? (item.variants?.[item.variantIndex]?.images?.[0] || item.image_url) : item.image_url}
                      alt={item.name}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">×{item.quantity}</p>
                    </div>
                    <p className="text-sm text-black dark:text-white">{formatEur(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                  <span className="text-black dark:text-white">{formatEur(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Shipping</span>
                  <span className="text-black dark:text-white">{shipping === 0 ? 'Free' : formatEur(shipping)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Free shipping on orders over {formatEur(FREE_SHIPPING_THRESHOLD)}
                  </p>
                )}
                <div className="flex justify-between text-base pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-black dark:text-white font-normal">Total</span>
                  <span className="text-black dark:text-white font-normal">{formatEur(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
