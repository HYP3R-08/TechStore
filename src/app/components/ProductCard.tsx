import { useState } from 'react';
import { Link } from 'react-router';
import { Product } from '../../lib/supabase';
import { Check } from 'lucide-react';
import { useCart } from '../../lib/CartContext';
import { formatEur } from '../../lib/pricing';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    // The card is wrapped in a Link to the product page.
    e.preventDefault();
    if (product.stock === 0) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm border border-white/80 dark:border-neutral-700/80 rounded-2xl overflow-hidden hover:bg-white/80 dark:hover:bg-neutral-800/90 hover:shadow-lg transition-all duration-300">
      <div className="relative overflow-hidden aspect-square">
        <img
          src={product.variants?.[0]?.images?.[0] || product.image_url}
          alt={product.name}
          loading="lazy"
          width={400}
          height={400}
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
          <p className="text-sm font-normal text-black dark:text-white">{formatEur(product.price)}</p>
        </div>
        <div className="relative">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            aria-label={product.stock === 0 ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
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
