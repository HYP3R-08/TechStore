import { useState } from 'react';
import { XCircle, Truck, PackageCheck, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Order } from '../../../lib/supabase';
import { formatEur } from '../../../lib/pricing';
import { STATUS_COLORS, STATUS_LABELS, type OrderWithDetails } from './types';

interface OrderRowProps {
  order: OrderWithDetails;
  onUpdate: (id: string, status: Order['status']) => Promise<void>;
  onDelete: (id: string) => void;
  onMarkShipped: (order: OrderWithDetails) => void;
}

export function OrderRow({ order, onUpdate, onDelete, onMarkShipped }: OrderRowProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (status: Order['status']) => {
    setLoading(true);
    await onUpdate(order.id, status);
    setLoading(false);
  };

  const unpaid = order.status === 'pending' || order.status === 'awaiting_payment';
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <>
      <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800">
        <td className="px-6 py-4">
          <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">#{shortId}</span>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-black dark:text-white">
            {order.profiles?.full_name || 'Unknown'}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {order.profiles?.email}
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-black dark:text-white font-normal">
          {formatEur(order.total)}
        </td>
        <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
          {new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center text-xs px-3 py-1 rounded-full border font-normal ${STATUS_COLORS[order.status] ?? ''}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            {/*
              An unpaid order can only be cancelled — there is deliberately no
              "Accept" action. Confirming a payment is Stripe's job, reported
              through the webhook; a button that moved an unpaid order to
              'processing' would just be a human declaring it paid instead.
            */}
            {unpaid && (
              <button
                onClick={() => act('cancelled')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}

            {order.status === 'processing' && (
              <>
                <button
                  onClick={() => onMarkShipped(order)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Mark Shipped
                </button>
                <button
                  onClick={() => act('cancelled')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}

            {order.status === 'shipped' && (
              <button
                onClick={() => act('delivered')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Mark Delivered
              </button>
            )}

            {order.status === 'cancelled' && (
              <button
                onClick={() => onDelete(order.id)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}

            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? `Hide details of order ${shortId}` : `Show details of order ${shortId}`}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {open ? (
                <ChevronUp className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-neutral-50 dark:bg-neutral-800">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                  Order Items
                </p>
                <div className="space-y-2">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm gap-4">
                      <span className="text-black dark:text-white">
                        {item.products?.name || 'Deleted product'}
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        ×{item.quantity} · {formatEur(item.unit_price)} each
                      </span>
                      <span className="text-black dark:text-white font-normal whitespace-nowrap">
                        {formatEur(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {order.shipping_address && (
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                    Shipping Address
                  </p>
                  <div className="text-sm text-black dark:text-white space-y-0.5">
                    {order.shipping_address.name && (
                      <p className="font-normal">{order.shipping_address.name}</p>
                    )}
                    {order.shipping_address.phone && (
                      <p className="text-neutral-500 dark:text-neutral-400">
                        {order.shipping_address.phone}
                      </p>
                    )}
                    {order.shipping_address.email && (
                      <p className="text-neutral-500 dark:text-neutral-400">
                        {order.shipping_address.email}
                      </p>
                    )}
                    {order.shipping_address.address && (
                      <div className="pt-1 space-y-0.5">
                        <p>{order.shipping_address.address.line1}</p>
                        {order.shipping_address.address.line2 && (
                          <p>{order.shipping_address.address.line2}</p>
                        )}
                        <p>
                          {[
                            order.shipping_address.address.city,
                            order.shipping_address.address.state,
                            order.shipping_address.address.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <p className="text-neutral-500 dark:text-neutral-400">
                          {order.shipping_address.address.country}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
