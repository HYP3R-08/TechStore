import { Link } from 'react-router';
import { Product } from '../../lib/supabase';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="group">
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
      <div className="space-y-1">
        <p className="text-xs text-neutral-500 tracking-wide">{product.brand} · {product.category}</p>
        <h3 className="text-sm font-light text-neutral-900 tracking-wide line-clamp-2">{product.name}</h3>
        <p className="text-sm font-normal text-black">${product.price.toLocaleString()}</p>
      </div>
    </Link>
  );
}
