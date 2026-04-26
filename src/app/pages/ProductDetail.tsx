import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { products } from '../data/mockData';
import { Button } from '../components/Button';
import { ArrowLeft, Check } from 'lucide-react';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">Product not found</p>
          <Link to="/products">
            <Button variant="outline">Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </Link>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Image */}
          <div className="relative bg-neutral-50 aspect-square overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-neutral-500 tracking-wide mb-2">{product.category}</p>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black mb-6">
              {product.name}
            </h1>
            <p className="text-3xl font-normal text-black mb-8">
              ${product.price}
            </p>

            <p className="text-neutral-700 leading-relaxed mb-8 text-sm tracking-wide">
              {product.description}
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="w-4 h-4" />
                <span>Premium quality materials</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="w-4 h-4" />
                <span>Free shipping on orders over $100</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="w-4 h-4" />
                <span>30-day return policy</span>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm text-neutral-700 tracking-wide">Quantity:</span>
              <div className="flex items-center border border-neutral-300 rounded-full overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-neutral-50 transition-colors text-neutral-700"
                >
                  −
                </button>
                <span className="px-6 py-2 text-sm font-normal">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-neutral-50 transition-colors text-neutral-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1"
              >
                {added ? 'Added to Cart!' : 'Add to Cart'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleAddToCart();
                  setTimeout(() => navigate('/cart'), 300);
                }}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-24">
          <h2 className="text-2xl font-light tracking-tight text-black mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products
              .filter(p => p.category === product.category && p.id !== product.id)
              .slice(0, 4)
              .map(relatedProduct => (
                <Link key={relatedProduct.id} to={`/product/${relatedProduct.id}`} className="group">
                  <div className="relative overflow-hidden bg-neutral-50 aspect-square mb-4">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-light text-neutral-900 tracking-wide">{relatedProduct.name}</h3>
                    <p className="text-sm font-normal text-black">${relatedProduct.price}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
