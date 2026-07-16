import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Product } from '../../../lib/supabase';
import { formatEur } from '../../../lib/pricing';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ImageUploader } from './ImageUploader';
import { VariantsEditor } from './VariantsEditor';
import { CATEGORIES } from './types';

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!editingProduct.name?.trim()) return toast.error('Name is required');
    if (!editingProduct.category) return toast.error('Category is required');
    if (!editingProduct.price || editingProduct.price <= 0) {
      return toast.error('Price must be greater than zero');
    }

    setSaving(true);
    const images = editingProduct.images ?? [];
    const image_url = images[0] ?? editingProduct.image_url ?? '';
    const variants = editingProduct.variants ?? [];

    // With variants, the per-colour stock is the source of truth and the total
    // is their sum; without them the single stock field is used directly.
    const stock =
      variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : (editingProduct.stock ?? 0);

    const payload = {
      name: editingProduct.name.trim(),
      price: editingProduct.price,
      category: editingProduct.category,
      brand: editingProduct.brand ?? '',
      description: editingProduct.description ?? '',
      featured: editingProduct.featured ?? false,
      image_url,
      images,
      variants,
      stock,
    };

    const { error } = editingProduct.id
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);

    if (error) {
      toast.error(`Could not save the product: ${error.message}`);
      return;
    }

    toast.success(editingProduct.id ? 'Product updated' : 'Product created');
    setIsEditing(false);
    setEditingProduct({});
    fetchProducts();
  };

  const openEdit = (product?: Product) => {
    setEditingProduct(
      product
        ? {
            ...product,
            images: product.images?.length
              ? product.images
              : product.image_url
                ? [product.image_url]
                : [],
            variants: product.variants ?? [],
          }
        : { images: [], variants: [] }
    );
    setIsEditing(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      toast.error(`Could not delete the product: ${error.message}`);
      return;
    }
    toast.success('Product deleted');
    fetchProducts();
  };

  const closeModal = () => {
    setIsEditing(false);
    setEditingProduct({});
  };

  const hasVariants = (editingProduct.variants?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => openEdit()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {isEditing && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2
                id="product-modal-title"
                className="text-2xl font-light tracking-tight text-black dark:text-white"
              >
                {editingProduct.id ? 'Edit Product' : 'Add Product'}
              </h2>
              <button type="button" onClick={closeModal} aria-label="Close">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Name"
                value={editingProduct.name ?? ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                placeholder="MacBook Pro 14&quot;"
              />
              <Input
                label="Brand"
                value={editingProduct.brand ?? ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                placeholder="Apple"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (€)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editingProduct.price ?? ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                  }
                  placeholder="999"
                />
                {!hasVariants ? (
                  <Input
                    label="Stock"
                    type="number"
                    min={0}
                    value={editingProduct.stock ?? ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                    }
                    placeholder="10"
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide">
                      Stock
                    </label>
                    <p className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-500 dark:text-neutral-400">
                      Managed per variant
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="product-category"
                  className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide"
                >
                  Category
                </label>
                <select
                  id="product-category"
                  value={editingProduct.category ?? ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <ImageUploader
                images={editingProduct.images ?? []}
                onChange={(imgs) => setEditingProduct({ ...editingProduct, images: imgs })}
              />
              <VariantsEditor
                variants={editingProduct.variants ?? []}
                onChange={(v) => setEditingProduct({ ...editingProduct, variants: v })}
              />

              <div className="space-y-2">
                <label
                  htmlFor="product-description"
                  className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide"
                >
                  Description
                </label>
                <textarea
                  id="product-description"
                  value={editingProduct.description ?? ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editingProduct.featured ?? false}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <label htmlFor="featured" className="text-sm text-neutral-700 dark:text-neutral-300">
                  Featured product
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
              <Button variant="outline" onClick={closeModal} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  {['Product', 'Brand', 'Category', 'Price', 'Stock', 'Featured', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-4 text-sm font-normal text-neutral-700 dark:text-neutral-300 tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.variants?.[0]?.images?.[0] || product.image_url}
                          alt=""
                          loading="lazy"
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover rounded bg-neutral-100"
                        />
                        <span className="text-sm text-black dark:text-white font-light">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-black dark:text-white">
                      {formatEur(product.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs ${product.featured ? 'bg-black text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                      >
                        {product.featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-neutral-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 text-sm">
                No products yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
