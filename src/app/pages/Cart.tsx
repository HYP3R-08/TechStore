import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { CartItem } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShoppingCart className="w-16 h-16 text-neutral-200 mx-auto mb-6" />
          <h2 className="text-3xl font-light tracking-tight text-black dark:text-white mb-4">
            Your cart is empty
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-sm tracking-wide">
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
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </Link>

        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black dark:text-white mb-12">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                <Link to={`/product/${item.id}`} className="w-24 h-24 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={item.variants?.[0]?.images?.[0] || item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/product/${item.id}`}
                      className="text-base font-light tracking-wide text-black dark:text-white hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      {item.category}{item.brand ? ` · ${item.brand}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-full overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 text-sm"
                      >
                        −
                      </button>
                      <span className="px-4 py-1 text-sm dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-base font-normal text-black dark:text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-full transition-colors self-start"
                >
                  <Trash2 className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-neutral-50 dark:bg-neutral-900 p-8 rounded-2xl sticky top-24">
              <h2 className="text-xl font-light tracking-tight text-black dark:text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                  <span className="text-black dark:text-white font-normal">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Shipping</span>
                  <span className="text-black dark:text-white font-normal">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Free shipping on orders over $100</p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-300 dark:border-neutral-700 mb-6">
                <div className="flex justify-between text-base">
                  <span className="text-black dark:text-white font-normal">Total</span>
                  <span className="text-black dark:text-white font-normal text-xl">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button fullWidth onClick={handleCheckout}>
                {user ? 'Proceed to Checkout' : 'Sign In to Checkout'}
              </Button>

              {!user && (
                <p className="text-xs text-neutral-500 text-center mt-4">
                  You must be signed in to complete your order
                </p>
              )}

              <div className="mt-6 space-y-2">
                {['Secure checkout', 'Official warranty on all products', 'Free returns within 30 days'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
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
