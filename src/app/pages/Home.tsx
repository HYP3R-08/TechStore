import { Link } from 'react-router';
import { products } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/Button';
import { ArrowRight } from 'lucide-react';

export function Home() {
  const featuredProducts = products.filter(p => p.featured);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center bg-neutral-50">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80"
            alt="Hero"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/30" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-black mb-6">
            Refined Simplicity
          </h1>
          <p className="text-lg md:text-xl text-neutral-700 mb-8 font-light tracking-wide">
            Curated essentials for the modern lifestyle
          </p>
          <Link to="/products">
            <Button>
              Explore Collection
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black mb-2">
              Featured
            </h2>
            <p className="text-neutral-600 text-sm tracking-wide">Handpicked for you</p>
          </div>
          <Link to="/products" className="hidden md:flex items-center gap-2 text-sm text-neutral-700 hover:text-black transition-colors group">
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-neutral-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black mb-12 text-center">
            Shop by Category
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
              { name: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' },
              { name: 'Home', image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80' },
              { name: 'Stationery', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80' }
            ].map(category => (
              <Link
                key={category.name}
                to={`/products?category=${category.name}`}
                className="group relative aspect-square overflow-hidden bg-neutral-100"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
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

      {/* Newsletter */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-black mb-4">
          Stay Updated
        </h2>
        <p className="text-neutral-600 mb-8 tracking-wide">
          Subscribe to receive updates on new arrivals and special offers
        </p>
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 bg-white border border-neutral-300 rounded-full text-sm focus:outline-none focus:border-black transition-colors"
          />
          <Button>Subscribe</Button>
        </div>
      </section>
    </div>
  );
}
