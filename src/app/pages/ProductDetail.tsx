import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { supabase, Product } from '../../lib/supabase';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/Button';
import { ArrowLeft, Check, Loader2, ShoppingCart } from 'lucide-react';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariant]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (data) {
      setProduct(data as Product);
      if ((data as Product).variants?.length > 0) setSelectedVariant(0);
      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', data.category)
        .neq('id', productId)
        .limit(4);
      setRelatedProducts((related as Product[]) || []);
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id && item.variantIndex === selectedVariant);

    if (existingItem) {
      existingItem.quantity = Math.min(currentStock, existingItem.quantity + quantity);
    } else {
      cart.push({ ...product, quantity: Math.min(currentStock, quantity), variantIndex: selectedVariant });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

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

  const allImages: string[] = product.images?.length ? product.images : [product.image_url];
  const variantImages = selectedVariant !== null ? (product.variants?.[selectedVariant]?.images ?? []) : [];
  const displayImages = variantImages.length > 0 ? variantImages : allImages;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const currentStock = hasVariants && selectedVariant !== null
    ? (product.variants[selectedVariant]?.stock ?? 0)
    : product.stock;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Image gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative bg-neutral-50 dark:bg-neutral-800 aspect-square overflow-hidden rounded-xl">
              <img
                src={displayImages[activeImage] || product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {displayImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-black' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400 tracking-wide">
                {product.category}
              </span>
              {product.brand && (
                <span className="text-xs px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400">
                  {product.brand}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black dark:text-white mb-4">
              {product.name}
            </h1>
            <p className="text-3xl font-normal text-black dark:text-white mb-2">
              €{product.price.toLocaleString()}
            </p>
            {currentStock > 0 ? (
              <p className="text-sm text-green-600 mb-6">
                {currentStock > 10 ? 'In stock' : `Only ${currentStock} left`}
              </p>
            ) : (
              <p className="text-sm text-red-500 mb-6">Out of stock</p>
            )}

            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 tracking-wide">
                  Color:{' '}
                  <span className="font-normal text-black dark:text-white">
                    {selectedVariant !== null ? product.variants[selectedVariant].color : 'Default'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVariant(i)}
                      className={`px-4 py-2 text-sm border rounded-full transition-colors ${
                        selectedVariant === i
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                      }`}
                    >
                      {variant.color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-8 text-sm tracking-wide">
              {product.description}
            </p>

            <div className="space-y-3 mb-8">
              {[
                'Official manufacturer warranty',
                'Free shipping on orders over €100',
                '30-day return policy',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check className="w-4 h-4" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm text-neutral-700 dark:text-neutral-300 tracking-wide">Quantity:</span>
              <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-full overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  −
                </button>
                <span className="px-6 py-2 text-sm font-normal dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock || 99, quantity + 1))}
                  className="px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1"
                disabled={currentStock === 0}
              >
                {added ? (
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" />Added!</span>
                ) : (
                  <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Add to Cart</span>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleAddToCart();
                  setTimeout(() => navigate('/cart'), 300);
                }}
                disabled={currentStock === 0}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-24">
            <h2 className="text-2xl font-light tracking-tight text-black dark:text-white mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
