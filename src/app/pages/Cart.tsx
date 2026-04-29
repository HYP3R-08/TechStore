import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { supabase, CartItem } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const updatedCart = cartItems.map(item =>
      item.id === id ? { ...item, quantity: Math.min(item.stock, Math.max(1, newQuantity)) } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('storage'));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('storage'));
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckingOut(true);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ user_id: user.id, status: 'pending', total })
      .select()
      .single();

    if (orderError || !order) {
      alert('Error placing order. Please try again.');
      setCheckingOut(false);
      return;
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))
    );

    if (itemsError) {
      alert('Error saving order items. Please try again.');
      setCheckingOut(false);
      return;
    }

    const { data: fn, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        cartItems: cartItems.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image_url: i.image_url,
        })),
        orderId: order.id,
        origin: window.location.origin,
      },
    });

    if (fnError || !fn?.url) {
      alert('Error connecting to payment. Please try again.');
      setCheckingOut(false);
      return;
    }

    window.location.href = fn.url;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShoppingCart className="w-16 h-16 text-neutral-200 mx-auto mb-6" />
          <h2 className="text-3xl font-light tracking-tight text-black mb-4">
            Your cart is empty
          </h2>
          <p className="text-neutral-600 mb-8 text-sm tracking-wide">
            Add some products to get started
          </p>
          <Link to="/products">
            <Button>Shop Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </Link>

        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black mb-12">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-6 pb-6 border-b border-neutral-200">
                <Link to={`/product/${item.id}`} className="w-24 h-24 bg-neutral-50 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/product/${item.id}`}
                      className="text-base font-light tracking-wide text-black hover:text-neutral-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-neutral-500 mt-1">
                      {item.category}{item.brand ? ` · ${item.brand}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-neutral-300 rounded-full overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-neutral-50 transition-colors text-neutral-700 text-sm"
                      >
                        −
                      </button>
                      <span className="px-4 py-1 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-neutral-50 transition-colors text-neutral-700 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-base font-normal text-black">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 hover:bg-neutral-50 rounded-full transition-colors self-start"
                >
                  <Trash2 className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-neutral-50 p-8 rounded-2xl sticky top-24">
              <h2 className="text-xl font-light tracking-tight text-black mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="text-black font-normal">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="text-black font-normal">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-neutral-500">Free shipping on orders over $100</p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-300 mb-6">
                <div className="flex justify-between text-base">
                  <span className="text-black font-normal">Total</span>
                  <span className="text-black font-normal text-xl">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button fullWidth onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut
                  ? 'Processing...'
                  : user
                  ? 'Proceed to Checkout'
                  : 'Sign In to Checkout'}
              </Button>

              {!user && (
                <p className="text-xs text-neutral-500 text-center mt-4">
                  You must be signed in to complete your order
                </p>
              )}

              <div className="mt-6 space-y-2">
                {['Secure checkout', 'Official warranty on all products', 'Free returns within 30 days'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-neutral-600">
                    <span>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
