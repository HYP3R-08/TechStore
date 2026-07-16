import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Product } from '../../lib/supabase';
import { ProductCard } from '../components/ProductCard';

const CATEGORIES = ['All', 'Laptop', 'Components', 'Monitor', 'Smartphone', 'Gaming', 'Others'];

/**
 * Lowercase and strip accents, so "pcie" matches "PCIe" and an accented query
 * still finds its product. Comparing raw strings would make search case- and
 * accent-sensitive, which just reads as "search is broken".
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Every whitespace-separated term must appear somewhere in the product, in any
 * order — so "asus 4070" finds the ROG laptop even though those words sit far
 * apart in the description. A single substring test would find nothing.
 */
function matches(product: Product, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = normalize(
    `${product.name} ${product.brand} ${product.category} ${product.description}`
  );
  return terms.every((term) => haystack.includes(term));
}

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('featured');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') ?? 'All';

  // Typing filters instantly against the already-loaded catalogue. The URL is
  // updated on a delay, purely so a result stays shareable and survives reload.
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query === (searchParams.get('q') ?? '')) return;
      const next = new URLSearchParams(searchParams);
      if (query) next.set('q', query);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchParams, setSearchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error(`Could not load products: ${error.message}`);
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /*
   * Filtering runs in the browser over the whole catalogue. That is deliberate
   * at this size: the products are already loaded, so results are instant and
   * cost no round trip. Past a few hundred products the right move is
   * server-side — .ilike() or a Postgres full-text index, plus .range() paging.
   */
  const visibleProducts = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);

    const filtered = products.filter(
      (p) => (selectedCategory === 'All' || p.category === selectedCategory) && matches(p, terms)
    );

    const sorted = [...filtered];
    if (sortBy === 'price-low') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured));

    return sorted;
  }, [products, selectedCategory, sortBy, query]);

  const handleCategoryChange = (category: string) => {
    // Built from the current params so the rest of the query string survives —
    // passing a fresh object here would silently drop the active search term.
    const next = new URLSearchParams(searchParams);
    if (category === 'All') next.delete('category');
    else next.set('category', category);
    setSearchParams(next);
  };

  const clearFilters = () => {
    setQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black dark:text-white mb-2">
            All Products
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm tracking-wide">
            {loading
              ? 'Loading...'
              : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'item' : 'items'}`}
            {query && !loading && <> for “{query}”</>}
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
            placeholder="Search by name, brand or description..."
            className="w-full pl-11 pr-11 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full text-sm text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-black dark:focus:border-neutral-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-neutral-500" />
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                aria-pressed={selectedCategory === category}
                className={`px-6 py-2 rounded-full text-sm tracking-wide transition-all ${
                  selectedCategory === category
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort products"
              className="appearance-none px-6 py-2 pr-10 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-full text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 dark:text-neutral-300 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-2">
              {query ? `No products match “${query}”` : 'No products in this category'}
            </p>
            {(query || selectedCategory !== 'All') && (
              <button onClick={clearFilters} className="text-sm text-black dark:text-white hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
