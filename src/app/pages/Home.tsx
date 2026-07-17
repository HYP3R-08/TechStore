import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { supabase, Product } from '../../lib/supabase';
import { formatEur, FREE_SHIPPING_THRESHOLD } from '../../lib/pricing';
import { Button } from '../components/Button';
import { ArrowRight, Cpu, HardDrive, Monitor, Wifi, TrendingUp } from 'lucide-react';

const IT_CATEGORIES = [
  { name: 'Laptop', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80' },
  { name: 'Components', image: 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/graphic-cards/50-series/geforce-rtx-50series-og-1200x630.jpg' },
  { name: 'Monitor', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQv6PhzL3jNZp_62adV-FUAU2_dCowFxP0vwg&s' },
  { name: 'Smartphone', image: 'https://www.kasigra.it/2127-large_default/apple-iphone-17-pro-max-256kb-arancione-cosmico-garanzia-24-mesi.jpg' },
  { name: 'Gaming', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbMJxWr3rnso-VzTuRnslx3SvsZuUxSPkNsg&s' },
  { name: 'Others', image: 'https://breunor.com/cdn/shop/files/gamdias-kit-tast---mouse---cuffie-poseidon-e2-3-in-1-tast-membrana-mouse-ottico.jpg?v=1762444845&width=1024' },
];

const HERO_WORDS = ['Laptop', 'Smartphone', 'Gaming', 'Monitor', 'Components'];

const PROMO_ITEMS = [
  `Free shipping over ${formatEur(FREE_SHIPPING_THRESHOLD)}`,
  'Official manufacturer warranty',
  '30-day return policy',
  'Expert technical support',
  'Fast & secure delivery',
];

type ProductWithSales = Product & { sold: number; soldPercent: number };

function BestSellerCard({ product }: { product: ProductWithSales }) {
  return (
    <Link to={`/product/${product.id}`} className="group bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-800">
        <img
          src={product.variants?.[0]?.images?.[0] || product.image_url}
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{product.brand} · {product.category}</p>
        <h3 className="text-sm font-light text-black dark:text-white tracking-wide line-clamp-2 mb-2">{product.name}</h3>
        <p className="text-sm font-normal text-black dark:text-white mb-3">{formatEur(product.price)}</p>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Sold</span>
            <span className="text-xs font-normal text-black dark:text-white">{product.soldPercent}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                product.soldPercent >= 80 ? 'bg-red-500' : product.soldPercent >= 50 ? 'bg-orange-400' : 'bg-black dark:bg-white'
              }`}
              style={{ width: `${product.soldPercent}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{product.stock} left in stock</p>
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const [bestSellers, setBestSellers] = useState<ProductWithSales[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [featuredVisible, setFeaturedVisible] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#best-sellers') {
      const el = document.getElementById('best-sellers');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash, bestSellers]);

  // Hero word cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => {
        setHeroIdx(prev => (prev + 1) % HERO_WORDS.length);
        setHeroVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Featured product carousel
  useEffect(() => {
    if (featuredProducts.length < 2) return;
    const interval = setInterval(() => {
      setFeaturedVisible(false);
      setTimeout(() => {
        setFeaturedIdx(prev => (prev + 1) % featuredProducts.length);
        setFeaturedVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredProducts]);

  useEffect(() => {
    async function loadAll() {
      const [salesRes, productsRes, featuredRes] = await Promise.all([
        supabase.rpc('get_product_sales'),
        supabase.from('products').select('*'),
        supabase.from('products').select('*').eq('featured', true).gt('stock', 0),
      ]);

      const products = (productsRes.data as Product[]) || [];

      if (products.length > 0) {
        // Shape of get_product_sales(): one row per product with its units sold.
        const sales = (salesRes.data ?? []) as Array<{ product_id: string; total_sold: number }>;
        const soldMap: Record<string, number> = {};
        sales.forEach((item) => {
          soldMap[item.product_id] = Number(item.total_sold);
        });

        const withSales: ProductWithSales[] = products.map(p => {
          const sold = soldMap[p.id] || 0;
          const original = p.stock + sold;
          return { ...p, sold, soldPercent: original > 0 ? Math.round((sold / original) * 100) : 0 };
        });

        setBestSellers(withSales.filter(p => p.stock > 0).sort((a, b) => b.sold - a.sold).slice(0, 6));

        const counts: Record<string, number> = {};
        products.filter(p => p.stock > 0).forEach(p => {
          counts[p.category] = (counts[p.category] || 0) + 1;
        });
        setCategoryCounts(counts);
      }

      if (featuredRes.data && featuredRes.data.length > 0) {
        setFeaturedProducts(featuredRes.data as Product[]);
      }
    }

    loadAll();
  }, []);

  const featuredProduct = featuredProducts[featuredIdx] ?? null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[90vh] flex items-center justify-center bg-neutral-900">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-60"
          >
            <source src="https://hpjrimwzwxlkchirygpj.supabase.co/storage/v1/object/public/product-images/11041433-hd_1920_1080_30fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-900/80" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6 gap-3">
            <Cpu className="w-5 h-5 text-white/60" />
            <HardDrive className="w-5 h-5 text-white/60" />
            <Monitor className="w-5 h-5 text-white/60" />
            <Wifi className="w-5 h-5 text-white/60" />
          </div>
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-4">
            TechStore
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-2 font-light tracking-wide">
            The best technology at your fingertips
          </p>
          <p className="text-sm text-white/40 mb-10 tracking-widest uppercase h-5">
            <span
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                display: 'inline-block',
              }}
            >
              {HERO_WORDS[heroIdx]}
            </span>
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/products">
              <Button className="!bg-white !text-black hover:!bg-neutral-100">Shop Now</Button>
            </Link>
            <Link to="/new-arrivals">
              <Button variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">
                New Arrivals
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <div className="bg-black py-3 overflow-hidden">
        <div
          className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite]"
          style={{ width: 'max-content' }}
        >
          {[...PROMO_ITEMS, ...PROMO_ITEMS, ...PROMO_ITEMS, ...PROMO_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-6 px-8 text-xs tracking-widest uppercase text-white/50">
              <span className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="bg-neutral-50 dark:bg-neutral-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black dark:text-white mb-12 text-center">
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
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors duration-300" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-white text-lg md:text-xl font-light tracking-wide block">
                      {category.name}
                    </span>
                    <span className="text-white/60 text-xs tracking-wide mt-0.5 block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {categoryCounts[category.name] ?? '—'}{' '}
                      {categoryCounts[category.name] === 1 ? 'product' : 'products'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Product Carousel */}
      {featuredProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <Link
            to={`/product/${featuredProduct.id}`}
            className="group grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden bg-neutral-900 hover:shadow-2xl transition-shadow duration-500 block"
            style={{
              opacity: featuredVisible ? 1 : 0,
              transform: featuredVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            <div className="aspect-square lg:aspect-auto overflow-hidden">
              <img
                src={featuredProduct.variants?.[0]?.images?.[0] || featuredProduct.image_url}
                alt={featuredProduct.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="flex flex-col justify-center p-10 lg:p-16 text-white">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs tracking-widest text-white/40 uppercase">Featured Product</span>
                {featuredProducts.length > 1 && (
                  <div className="flex gap-1.5">
                    {featuredProducts.map((_, i) => (
                      <span
                        key={i}
                        className={`block h-1 rounded-full transition-all duration-300 ${
                          i === featuredIdx ? 'w-6 bg-white' : 'w-2 bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-white/50 mb-2 tracking-wide">{featuredProduct.brand} · {featuredProduct.category}</p>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 leading-snug">
                {featuredProduct.name}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-10 line-clamp-3">
                {featuredProduct.description}
              </p>
              <div className="flex items-center gap-6">
                <span className="text-2xl font-normal">{formatEur(featuredProduct.price)}</span>
                <span className="flex items-center gap-2 text-sm px-5 py-2.5 border border-white/20 rounded-full text-white/70 group-hover:bg-white group-hover:text-black transition-all duration-300">
                  View Product
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section id="best-sellers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-black dark:text-white" />
                <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black dark:text-white">
                  Best Sellers
                </h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm tracking-wide">Top picks based on sales</p>
            </div>
            <Link to="/products" className="hidden md:flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors group">
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
              {
                title: 'Fast Shipping',
                desc: `Free shipping on orders over ${formatEur(FREE_SHIPPING_THRESHOLD)}`,
              },
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
