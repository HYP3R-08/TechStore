import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import { CheckCircle, Package, Loader2 } from 'lucide-react';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('order_id');
  const confirmed = useRef(false);

  useEffect(() => {
    if (orderId && !confirmed.current) {
      confirmed.current = true;
      confirmOrder();
    } else if (!orderId) {
      setLoading(false);
    }
  }, [orderId]);

  const confirmOrder = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && orderId) {
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId)
        .eq('user_id', session.user.id)
        .eq('status', 'pending');
    }
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event('storage'));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-4" />
          <p className="text-sm text-neutral-500">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-12 max-w-md w-full text-center shadow-sm">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-light tracking-tight text-black mb-3">
          Payment Successful!
        </h1>
        <p className="text-neutral-600 text-sm mb-2">
          Your order has been confirmed and is being processed.
        </p>
        {orderId && (
          <p className="text-xs text-neutral-400 font-mono mb-8">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
        )}

        <div className="space-y-3">
          <Link
            to="/account"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-black text-white text-sm rounded-full hover:bg-neutral-800 transition-colors"
          >
            <Package className="w-4 h-4" />
            Track Your Order
          </Link>
          <Link
            to="/products"
            className="flex items-center justify-center w-full px-6 py-3 border border-neutral-300 text-black text-sm rounded-full hover:border-black transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
