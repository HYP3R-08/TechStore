import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase, CartItem } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
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

export function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
    if (!user) { navigate('/auth'); return; }
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) { navigate('/cart'); return; }
    setCartItems(cart);
    setForm(f => ({ ...f, email: user.email ?? '' }));
  }, [user]);

  const update = (field: keyof ShippingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 100 ? 0 : 15;
    const total = subtotal + shipping;
    const orderId = crypto.randomUUID();

    const shippingAddress = {
      name: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email,
      address: {
        line1: form.line1,
        line2: form.line2 || null,
        city: form.city,
        state: form.state || null,
        postal_code: form.postalCode,
        country: form.country,
      },
    };

    const { data: fn, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        cartItems: cartItems.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image_url: i.image_url,
        })),
        orderId,
        origin: window.location.origin,
      },
    });

    if (fnError || !fn?.url) {
      alert('Error connecting to payment. Please try again.');
      setSubmitting(false);
      return;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ id: orderId, user_id: user.id, status: 'pending', total, shipping_address: shippingAddress })
      .select()
      .single();

    if (orderError || !order) {
      alert('Error placing order. Please try again.');
      setSubmitting(false);
      return;
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      cartItems.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        variant_index: item.variantIndex ?? null,
      }))
    );

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', orderId);
      alert('Error saving order. Please try again.');
      setSubmitting(false);
      return;
    }

    window.location.href = fn.url;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const total = subtotal + shipping;

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
                  <div key={`${item.id}-${item.variantIndex}`} className="flex items-center gap-3">
                    <img
                      src={item.variantIndex != null ? (item.variants?.[item.variantIndex]?.images?.[0] || item.image_url) : item.image_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">×{item.quantity}</p>
                    </div>
                    <p className="text-sm text-black dark:text-white">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                  <span className="text-black dark:text-white">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Shipping</span>
                  <span className="text-black dark:text-white">{shipping === 0 ? 'Free' : `€${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Free shipping on orders over €100</p>
                )}
                <div className="flex justify-between text-base pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-black dark:text-white font-normal">Total</span>
                  <span className="text-black dark:text-white font-normal">€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
