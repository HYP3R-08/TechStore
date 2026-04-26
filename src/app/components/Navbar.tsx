import { Link, useLocation } from 'react-router';
import { Search, ShoppingBag, User, Menu } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  cartCount: number;
}

export function Navbar({ cartCount }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-light tracking-tight">LUXE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/products"
              className={`text-sm tracking-wide transition-colors ${
                isActive('/products') ? 'text-black' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Shop
            </Link>
            <Link
              to="/products?category=Accessories"
              className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors"
            >
              Accessories
            </Link>
            <Link
              to="/products?category=Audio"
              className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors"
            >
              Audio
            </Link>
            <Link
              to="/products?category=Home"
              className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors"
            >
              Home
            </Link>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
              <Search className="w-5 h-5 text-neutral-700" />
            </button>
            <Link to="/auth" className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
              <User className="w-5 h-5 text-neutral-700" />
            </Link>
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
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200">
            <div className="flex flex-col gap-4">
              <Link to="/products" className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                Shop
              </Link>
              <Link to="/products?category=Accessories" className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                Accessories
              </Link>
              <Link to="/products?category=Audio" className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                Audio
              </Link>
              <Link to="/products?category=Home" className="text-sm text-neutral-600 hover:text-black tracking-wide transition-colors">
                Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
