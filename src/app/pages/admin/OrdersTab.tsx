import { useCallback, useEffect, useState } from 'react';
import { Loader2, Truck, X, Bell } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, type Order } from '../../../lib/supabase';
import { Button } from '../../components/Button';
import { OrderRow } from './OrderRow';
import type { OrderWithDetails } from './types';

type ShippingModal = { order: OrderWithDetails; trackingUrl: string; sending: boolean } | null;

async function functionMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body && typeof body.error === 'string') return body.error;
  }
  return fallback;
}

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingModal, setShippingModal] = useState<ShippingModal>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    // Orders still awaiting payment are not real orders: the customer opened
    // Stripe and may never come back. They stay out of the fulfilment view.
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, unit_price, products(name))')
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(`Could not load orders: ${error.message}`);
      setLoading(false);
      return;
    }

    const ordersData = (data ?? []) as OrderWithDetails[];
    if (ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Fetched separately: orders.user_id references auth.users, so PostgREST
    // cannot infer a join to profiles from the foreign keys.
    const userIds = [...new Set(ordersData.map((o) => o.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) toast.error(`Could not load customers: ${profilesError.message}`);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    setOrders(
      ordersData.map((o) => ({ ...o, profiles: profileMap.get(o.user_id) ?? undefined }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: Order['status']) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select('id');

    if (error) {
      toast.error(`Could not update the order: ${error.message}`);
      return;
    }
    // RLS reports no error when it simply matches no rows, so `.select()` is what
    // tells us the update landed. Without it a silently discarded write looks
    // exactly like a successful one.
    if (!data || data.length === 0) {
      toast.error('The order was not updated — you may not have permission.');
      return;
    }

    // Cancelling restores stock through a database trigger, so there is nothing
    // to call for it from here.
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(status === 'cancelled' ? 'Order cancelled' : `Order marked ${status}`);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this cancelled order permanently?')) return;

    const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', id);
    if (itemsError) {
      toast.error(`Could not delete the order items: ${itemsError.message}`);
      return;
    }

    const { error: orderError } = await supabase.from('orders').delete().eq('id', id);
    if (orderError) {
      toast.error(`Could not delete the order: ${orderError.message}`);
      return;
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));
    toast.success('Order deleted');
  };

  const confirmShip = async () => {
    if (!shippingModal) return;
    const { order, trackingUrl } = shippingModal;

    const trimmed = trackingUrl.trim();
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol');
    } catch {
      toast.error('Enter a valid http(s) tracking URL');
      return;
    }

    setShippingModal((m) => m && { ...m, sending: true });

    // The tracking URL is saved before the email goes out, because the Edge
    // Function reads it from the order rather than from the request body.
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'shipped', tracking_url: trimmed })
      .eq('id', order.id)
      .select('id');

    if (error || !data?.length) {
      toast.error(error ? `Could not update the order: ${error.message}` : 'The order was not updated');
      setShippingModal((m) => m && { ...m, sending: false });
      return;
    }

    const { error: emailError } = await supabase.functions.invoke('send-shipping-email', {
      body: { orderId: order.id },
    });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, status: 'shipped' as const, tracking_url: trimmed } : o
      )
    );
    setShippingModal(null);

    if (emailError) {
      // The order is shipped either way — only the notification failed, and the
      // admin needs to know that rather than assume the customer was told.
      toast.warning(
        await functionMessage(emailError, 'Order marked shipped, but the email could not be sent.')
      );
      return;
    }

    toast.success('Order marked shipped and the customer has been emailed');
  };

  const unpaidCount = orders.filter((o) => o.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shippingModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ship-modal-title"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2
                id="ship-modal-title"
                className="text-xl font-light tracking-tight text-black dark:text-white"
              >
                Mark as Shipped
              </h2>
              <button onClick={() => setShippingModal(null)} aria-label="Close">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              An email with the tracking link will be sent to{' '}
              <span className="text-black dark:text-white">
                {shippingModal.order.shipping_address?.email ?? shippingModal.order.profiles?.email}
              </span>
              .
            </p>

            <div className="space-y-2 mb-6">
              <label
                htmlFor="tracking-url"
                className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide"
              >
                Tracking URL
              </label>
              <input
                id="tracking-url"
                type="url"
                value={shippingModal.trackingUrl}
                onChange={(e) => setShippingModal((m) => m && { ...m, trackingUrl: e.target.value })}
                placeholder="https://track.carrier.com/..."
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmShip}
                className="flex-1"
                disabled={!shippingModal.trackingUrl.trim() || shippingModal.sending}
              >
                {shippingModal.sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Confirm &amp; Send Email
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShippingModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {unpaidCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl">
          <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-normal">
              {unpaidCount} order{unpaidCount > 1 ? 's' : ''}
            </span>{' '}
            {unpaidCount > 1 ? 'were' : 'was'} never paid for. They can be cancelled — payment is
            confirmed automatically by Stripe, never by hand.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                {['Order ID', 'Customer', 'Total', 'Date', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`text-left px-6 py-4 text-sm font-normal text-neutral-700 dark:text-neutral-300 tracking-wide ${h === 'Actions' ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onUpdate={updateStatus}
                  onDelete={deleteOrder}
                  onMarkShipped={(o) => setShippingModal({ order: o, trackingUrl: '', sending: false })}
                />
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 text-sm">
              No orders yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
