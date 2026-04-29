import { Link, useLocation } from 'react-router';
import { ShoppingBag, User, Menu, X, Cpu, LogOut, Shield, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface NavbarProps {
  cartCount: number;
}

const NAV_CATEGORIES = [
  { name: 'Laptop', path: '/products?category=Laptop' },
  { name: 'Components', path: '/products?category=Components' },
  { name: 'Monitor', path: '/products?category=Monitor' },
  { name: 'Smartphone', path: '/products?category=Smartphone' },
  { name: 'Gaming', path: '/products?category=Gaming' },
  { name: 'Others', path: '/products?category=Others' },
];

export function Navbar({ cartCount }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-light tracking-tight">TechStore</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/products"
              className={`text-sm tracking-wide transition-colors ${
                isActive('/products') ? 'text-black' : 'text-neutral-600 hover:text-black'
              }`}
            >
              All
            </Link>
            {NAV_CATEGORIES.map(cat => (
              <Link
                key={cat.name}
                to={cat.path}
                className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-2 hover:bg-neutral-50 rounded-full transition-colors flex items-center gap-2"
              >
                <User className="w-5 h-5 text-neutral-700" />
                {user && (
                  <span className="hidden md:block text-xs text-neutral-600 max-w-24 truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-xs text-neutral-500">Signed in as</p>
                        <p className="text-sm text-black truncate">{user.email}</p>
                        {isAdmin && (
                          <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
                        )}
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <ClipboardList className="w-4 h-4" />
                        My Orders
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>

            <Link to="/cart" className="p-2 hover:bg-neutral-50 rounded-full transition-colors relative">
              <ShoppingBag className="w-5 h-5 text-neutral-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              className="md:hidden p-2 hover:bg-neutral-50 rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5 text-neutral-700" /> : <Menu className="w-5 h-5 text-neutral-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200">
            <div className="flex flex-col gap-4">
              <Link to="/products" onClick={() => setIsMenuOpen(false)} className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                All Products
              </Link>
              {NAV_CATEGORIES.map(cat => (
                <Link key={cat.name} to={cat.path} onClick={() => setIsMenuOpen(false)} className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                  {cat.name}
                </Link>
              ))}
              {!user && (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                  Sign In
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Close user menu on outside click */}
      {isUserMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
      )}
    </nav>
  );
}
