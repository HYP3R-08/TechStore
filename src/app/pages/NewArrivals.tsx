import { useState, useEffect } from 'react';
import { supabase, Product } from '../../lib/supabase';
import { mockProducts } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { Loader2, Sparkles } from 'lucide-react';

export function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNew = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error || !data || data.length === 0) {
        setProducts([...mockProducts].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 12));
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchNew();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-black" />
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black">New Arrivals</h1>
        </div>
        <p className="text-neutral-500 text-sm mb-12 tracking-wide">The latest additions to our catalog</p>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
