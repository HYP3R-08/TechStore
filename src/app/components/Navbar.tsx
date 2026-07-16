import { Link, useLocation } from 'react-router';
import { ShoppingBag, User, Menu, X, Cpu, LogOut, Shield, ClipboardList, Moon, Sun, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';

interface NavbarProps {
  cartCount: number;
}

const NAV_LINKS = [
  { name: 'Products', path: '/products' },
  { name: 'Top Picks', path: '/#best-sellers' },
  { name: 'New Arrivals', path: '/new-arrivals' },
];

export function Navbar({ cartCount }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white dark:text-black" />
            </div>
            <span className="text-lg font-light tracking-tight text-black dark:text-white">TechStore</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm tracking-wide transition-colors ${
                  isActive(link.path)
                    ? 'text-black dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-1">
            <Link
              to="/products"
              aria-label="Search products"
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <Search className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              {theme === 'dark'
                ? <Sun className="w-5 h-5 text-neutral-300" />
                : <Moon className="w-5 h-5 text-neutral-600" />
              }
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="Account menu"
                aria-expanded={isUserMenuOpen}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors flex items-center gap-2"
              >
                <User className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                {user && (
                  <span className="hidden md:block text-xs text-neutral-600 dark:text-neutral-400 max-w-24 truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg overflow-hidden z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Signed in as</p>
                        <p className="text-sm text-black dark:text-white truncate">{user.email}</p>
                        {isAdmin && (
                          <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
                        )}
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <ClipboardList className="w-4 h-4" />
                        My Orders
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/cart"
              aria-label={
                cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart, empty'
              }
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black dark:bg-white text-white dark:text-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen
                ? <X className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                : <Menu className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              }
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white tracking-wide transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              {!user && (
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white tracking-wide transition-colors"
                >
                  Sign In
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white tracking-wide transition-colors"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {isUserMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
      )}
    </nav>
  );
}
