import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { supabase, Product } from '../../lib/supabase';
import { mockProducts } from '../data/mockData';
import { Button } from '../components/Button';
import { ArrowRight, Cpu, HardDrive, Monitor, Wifi, TrendingUp } from 'lucide-react';

const IT_CATEGORIES = [
  { name: 'Laptop', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80' },
  { name: 'Components', image: 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/graphic-cards/50-series/geforce-rtx-50series-og-1200x630.jpg' },
  { name: 'Monitor', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQv6PhzL3jNZp_62adV-FUAU2_dCowFxP0vwg&s' },
  { name: 'Smartphone', image: 'https://www.kasigra.it/2127-large_default/apple-iphone-17-pro-max-256gb-arancione-cosmico-garanzia-24-mesi.jpg' },
  { name: 'Gaming', image: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21' },
  { name: 'Others', image: 'https://breunor.com/cdn/shop/files/gamdias-kit-tast---mouse---cuffie-poseidon-e2-3-in-1-tast-membrana-mouse-ottico.jpg?v=1762444845&width=1024' },
];

type ProductWithSales = Product & { sold: number; soldPercent: number };

function BestSellerCard({ product }: { product: ProductWithSales }) {
  return (
    <Link to={`/product/${product.id}`} className="group bg-white border border-neutral-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.soldPercent >= 80 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-normal">
            Almost sold out
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-neutral-500 mb-1">{product.brand} · {product.category}</p>
        <h3 className="text-sm font-light text-black tracking-wide line-clamp-2 mb-2">{product.name}</h3>
        <p className="text-sm font-normal text-black mb-3">${product.price.toLocaleString()}</p>

        {/* Sold percentage bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-neutral-500">Sold</span>
            <span className="text-xs font-normal text-black">{product.soldPercent}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                product.soldPercent >= 80
                  ? 'bg-red-500'
                  : product.soldPercent >= 50
                  ? 'bg-orange-400'
                  : 'bg-black'
              }`}
              style={{ width: `${product.soldPercent}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1">{product.stock} left in stock</p>
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const [bestSellers, setBestSellers] = useState<ProductWithSales[]>([]);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#best-sellers') {
      const el = document.getElementById('best-sellers');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash, bestSellers]);

  useEffect(() => {
    async function loadBestSellers() {
      // Fetch sold quantities from order_items
      const { data: salesData } = await supabase
        .from('order_items')
        .select('product_id, quantity');

      // Fetch all products
      const { data: products, error } = await supabase
        .from('products')
        .select('*');

      if (error || !products || products.length === 0) {
        // Fallback: mock data with simulated sales
        const mockSales: Record<string, number> = { '1': 8, '2': 5, '3': 18, '12': 7, '7': 11, '8': 22 };
        const withSales = mockProducts.map(p => {
          const sold = mockSales[p.id] || 0;
          const original = p.stock + sold;
          return { ...p, sold, soldPercent: original > 0 ? Math.round((sold / original) * 100) : 0 };
        });
        setBestSellers(withSales.filter(p => p.stock > 0).sort((a, b) => b.sold - a.sold).slice(0, 6));
        return;
      }

      // Aggregate sold quantities per product
      const soldMap: Record<string, number> = {};
      (salesData || []).forEach(item => {
        soldMap[item.product_id] = (soldMap[item.product_id] || 0) + item.quantity;
      });

      const withSales: ProductWithSales[] = (products as Product[]).map(p => {
        const sold = soldMap[p.id] || 0;
        const original = p.stock + sold;
        return { ...p, sold, soldPercent: original > 0 ? Math.round((sold / original) * 100) : 0 };
      });

      setBestSellers(withSales.filter(p => p.stock > 0).sort((a, b) => b.sold - a.sold).slice(0, 6));
    }

    loadBestSellers();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[90vh] flex items-center justify-center bg-neutral-900">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80"
            alt="Hero"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-900/80" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6 gap-3">
            <Cpu className="w-5 h-5 text-white/60" />
            <HardDrive className="w-5 h-5 text-white/60" />
            <Monitor className="w-5 h-5 text-white/60" />
            <Wifi className="w-5 h-5 text-white/60" />
          </div>
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6">
            TechStore
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-8 font-light tracking-wide">
            The best technology at your fingertips
          </p>
          <Link to="/products">
            <Button className="!bg-white !text-black hover:!bg-neutral-100">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-neutral-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black mb-12 text-center">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {IT_CATEGORIES.map(category => (
              <Link
                key={category.name}
                to={`/products?category=${category.name}`}
                className="group relative aspect-video overflow-hidden bg-neutral-100"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg md:text-xl font-light tracking-wide">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section id="best-sellers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-black" />
                <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black">
                  Best Sellers
                </h2>
              </div>
              <p className="text-neutral-600 text-sm tracking-wide">Top picks based on sales</p>
            </div>
            <Link to="/products" className="hidden md:flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors group">
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestSellers.map(product => (
              <BestSellerCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Value Props */}
      <section className="bg-neutral-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { title: 'Official Warranty', desc: 'All products come with full manufacturer warranty' },
              { title: 'Expert Support', desc: 'Technical assistance from our IT specialists' },
              { title: 'Fast Shipping', desc: 'Free shipping on orders over $100' },
            ].map(item => (
              <div key={item.title} className="text-white">
                <h3 className="text-lg font-light tracking-wide mb-2">{item.title}</h3>
                <p className="text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
