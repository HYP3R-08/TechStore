import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { supabase, Order, OrderItem, Product } from '../../lib/supabase';
import { formatEur } from '../../lib/pricing';
import { useAuth } from '../../lib/AuthContext';
import { Loader2, Package, ChevronDown, ChevronUp, User, Mail, ShieldCheck } from 'lucide-react';

type OrderWithItems = Order & {
  order_items: (OrderItem & { products: Product | null })[];
};

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'] as const;

// 'pending' means the same as 'awaiting_payment' and only appears on rows from
// older versions. Both are labelled for what they are: nothing has been paid, so
// nothing is on its way.
const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  processing: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  processing: 'text-blue-600 bg-blue-50 border-blue-200',
  shipped: 'text-purple-600 bg-purple-50 border-purple-200',
  delivered: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
};

function ShippingTracker({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 mt-4">
        <span className={`text-xs px-3 py-1 rounded-full border font-normal ${STATUS_COLORS.cancelled}`}>
          Order cancelled
        </span>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-normal transition-colors ${
                    done
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                  } ${active ? 'ring-2 ring-black dark:ring-white ring-offset-2 dark:ring-offset-neutral-900' : ''}`}
                >
                  {done && !active ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 tracking-wide whitespace-nowrap ${done ? 'text-black dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 mb-4 ${i < currentStep ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Order</p>
            <p className="text-sm font-mono text-black dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Date</p>
            <p className="text-sm text-black dark:text-white">{new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Total</p>
            <p className="text-sm font-normal text-black dark:text-white">${order.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Items</p>
            <p className="text-sm text-black dark:text-white">{order.order_items.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full border font-normal ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-5">
          {/* Shipping tracker */}
          <h4 className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide uppercase mb-2">Shipping Status</h4>
          <ShippingTracker status={order.status} />

          {/* Items */}
          <h4 className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide uppercase mt-6 mb-3">Items</h4>
          <div className="space-y-3">
            {order.order_items.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                {(item.products?.variants?.[0]?.images?.[0] || item.products?.image_url) && (
                  <img
                    src={item.products!.variants?.[0]?.images?.[0] || item.products!.image_url}
                    alt={item.products.name}
                    className="w-12 h-12 object-cover rounded-lg bg-neutral-100 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {item.products ? (
                    <Link
                      to={`/product/${item.product_id}`}
                      className="text-sm text-black dark:text-white hover:underline truncate block"
                    >
                      {item.products.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-neutral-500">Product no longer available</p>
                  )}
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Qty: {item.quantity} · {formatEur(item.unit_price)} each
                  </p>
                </div>
                <p className="text-sm font-normal text-black dark:text-white flex-shrink-0">
                  {formatEur(item.quantity * item.unit_price)}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <p className="text-sm text-black dark:text-white">Total: <span className="font-normal">${order.total.toFixed(2)}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

export function Account() {
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);

    // Orders still awaiting payment are not shown: the customer opened Stripe and
    // may never have paid, so listing them as orders would be a lie.
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('user_id', user.id)
      .neq('status', 'awaiting_payment')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) toast.error(`Could not load your orders: ${error.message}`);
    setOrders((data as OrderWithItems[]) ?? []);
    setLoadingOrders(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-light tracking-tight text-black dark:text-white mb-10">My Account</h1>

        {/* Profile card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-normal tracking-wide text-neutral-500 dark:text-neutral-400 uppercase mb-4">Profile</h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-black dark:text-white">{profile?.full_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-black dark:text-white">{user?.email}</span>
              </div>
              {profile?.role === 'admin' && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs px-2 py-0.5 bg-black text-white rounded-full">Admin</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders */}
        <h2 className="text-sm font-normal tracking-wide text-neutral-500 dark:text-neutral-400 uppercase mb-4">
          Order History
        </h2>

        {loadingOrders ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl py-16 text-center">
            <Package className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">You haven't placed any orders yet</p>
            <Link
              to="/products"
              className="text-sm text-black dark:text-white hover:underline"
            >
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
