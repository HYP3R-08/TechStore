import { Link } from 'react-router';
import { Product, CartItem } from '../../lib/supabase';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + 1);
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col">
      <div className="relative overflow-hidden bg-neutral-50 aspect-square mb-4 rounded-lg">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs text-neutral-500 tracking-wide">Out of stock</span>
          </div>
        )}
      </div>
      <div className="space-y-1 mb-4 flex-1">
        <p className="text-xs text-neutral-500 tracking-wide">{product.brand} · {product.category}</p>
        <h3 className="text-sm font-light text-neutral-900 tracking-wide line-clamp-2">{product.name}</h3>
        <p className="text-sm font-normal text-black">${product.price.toLocaleString()}</p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className="w-full py-2.5 bg-black text-white text-xs tracking-wide rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
      >
        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </Link>
  );
}
