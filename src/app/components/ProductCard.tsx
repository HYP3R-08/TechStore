import { Link } from 'react-router';
import { Product } from '../data/mockData';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className="relative overflow-hidden bg-neutral-50 aspect-square mb-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-light text-neutral-900 tracking-wide">{product.name}</h3>
        <p className="text-xs text-neutral-500 tracking-wide">{product.category}</p>
        <p className="text-sm font-normal text-black">${product.price}</p>
      </div>
    </Link>
  );
}
