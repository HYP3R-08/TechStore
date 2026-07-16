import { Outlet, useLocation } from 'react-router';
import { Navbar } from './Navbar';
import { useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { useCart } from '../../lib/CartContext';

export function Layout() {
  const { count } = useCart();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar cartCount={count} />
      <main className="pt-16">
        <Outlet />
      </main>
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-black" />
                </div>
                <h3 className="text-xl font-light tracking-tight">TechStore</h3>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                The best IT technology at your fingertips. Official products, expert support.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="/products" className="hover:text-white transition-colors">All Products</a></li>
                <li><a href="/products?category=Laptop" className="hover:text-white transition-colors">Laptop</a></li>
                <li><a href="/products?category=Components" className="hover:text-white transition-colors">Components</a></li>
                <li><a href="/products?category=Gaming" className="hover:text-white transition-colors">Gaming</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="/support#contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="/support#shipping" className="hover:text-white transition-colors">Shipping Info</a></li>
                <li><a href="/support#returns" className="hover:text-white transition-colors">Returns</a></li>
                <li><a href="/support#technical-support" className="hover:text-white transition-colors">Technical Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-normal tracking-wide mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="/company#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/company#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/company#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
            © 2026 TechStore. All rights reserved.
            Site Created By Pennino Cristian Francesco
          </div>
        </div>
      </footer>
    </div>
  );
}
