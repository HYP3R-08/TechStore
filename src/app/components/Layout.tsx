import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { useState, useEffect } from 'react';

export function Layout() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener('storage', updateCartCount);

    const interval = setInterval(updateCartCount, 1000);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar cartCount={cartCount} />
      <main className="pt-16">
        <Outlet />
      </main>
      <footer className="bg-neutral-900 text-white py-16 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-xl font-light tracking-tight mb-4">LUXE</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Curated essentials for the modern lifestyle
              </p>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="/products" className="hover:text-white transition-colors">All Products</a></li>
                <li><a href="/products?category=Accessories" className="hover:text-white transition-colors">Accessories</a></li>
                <li><a href="/products?category=Audio" className="hover:text-white transition-colors">Audio</a></li>
                <li><a href="/products?category=Home" className="hover:text-white transition-colors">Home</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Shipping</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Returns</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
            © 2026 LUXE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
