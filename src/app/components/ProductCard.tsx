import { useState } from 'react';
import { Link } from 'react-router';
import { Product, CartItem } from '../../lib/supabase';
import { Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock === 0) return;
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + 1);
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm border border-white/80 dark:border-neutral-700/80 rounded-2xl overflow-hidden hover:bg-white/80 dark:hover:bg-neutral-800/90 hover:shadow-lg transition-all duration-300">
      <div className="relative overflow-hidden aspect-square">
        <img
          src={product.variants?.[0]?.images?.[0] || product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 dark:bg-neutral-900/70 flex items-center justify-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">Out of stock</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="space-y-1 mb-4 flex-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">{product.brand} · {product.category}</p>
          <h3 className="text-sm font-light text-neutral-900 dark:text-white tracking-wide line-clamp-2">{product.name}</h3>
          <p className="text-sm font-normal text-black dark:text-white">${product.price.toLocaleString()}</p>
        </div>
        <div className="relative">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`w-full py-2.5 text-xs tracking-wide rounded-lg transition-all duration-300 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed ${
              added
                ? 'bg-green-600 text-white animate-[pop_0.35s_ease-out]'
                : 'bg-black text-white hover:bg-neutral-800 active:scale-95'
            }`}
          >
            {added ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Added!
              </span>
            ) : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}
