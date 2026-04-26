import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { products, categories } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { ChevronDown } from 'lucide-react';

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState('featured');

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = selectedCategory === 'All'
      ? products
      : products.filter(p => p.category === selectedCategory);

    if (sortBy === 'price-low') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [selectedCategory, sortBy]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category !== 'All') {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black mb-2">
            All Products
          </h1>
          <p className="text-neutral-600 text-sm tracking-wide">
            {filteredAndSortedProducts.length} items
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-6 border-b border-neutral-200">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-2 rounded-full text-sm tracking-wide transition-all ${
                  selectedCategory === category
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-6 py-2 pr-10 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700 focus:outline-none focus:border-black transition-colors cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 pointer-events-none" />
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {filteredAndSortedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-24">
            <p className="text-neutral-500 text-lg">No products found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
