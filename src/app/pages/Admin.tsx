import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { products as initialProducts, Product } from '../data/mockData';
import { Plus, Edit2, Trash2, LogOut } from 'lucide-react';

export function Admin() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/auth');
    }
  }, [navigate]);

  const handleSave = () => {
    if (editingProduct.id) {
      setProducts(products.map(p =>
        p.id === editingProduct.id ? editingProduct as Product : p
      ));
    } else {
      const newProduct: Product = {
        ...editingProduct,
        id: Date.now().toString(),
        featured: false
      } as Product;
      setProducts([...products, newProduct]);
    }
    setIsEditing(false);
    setEditingProduct({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-black mb-2">
              Admin Dashboard
            </h1>
            <p className="text-neutral-600 text-sm tracking-wide">
              Manage your products
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setIsEditing(true);
                setEditingProduct({});
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-light tracking-tight text-black mb-6">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>

              <div className="space-y-4">
                <Input
                  label="Product Name"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Minimalist Watch"
                />

                <Input
                  label="Price"
                  type="number"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  placeholder="299"
                />

                <div className="space-y-2">
                  <label className="block text-sm text-neutral-700 tracking-wide">
                    Category
                  </label>
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                  >
                    <option value="">Select category</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Audio">Audio</option>
                    <option value="Home">Home</option>
                    <option value="Stationery">Stationery</option>
                  </select>
                </div>

                <Input
                  label="Image URL"
                  value={editingProduct.image || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />

                <div className="space-y-2">
                  <label className="block text-sm text-neutral-700 tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors resize-none"
                    rows={4}
                    placeholder="Product description..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={editingProduct.featured || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-300"
                  />
                  <label htmlFor="featured" className="text-sm text-neutral-700">
                    Featured product
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button onClick={handleSave} className="flex-1">
                  Save Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingProduct({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">
                    Product
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">
                    Price
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">
                    Featured
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover bg-neutral-100 rounded"
                        />
                        <span className="text-sm text-black font-light">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-black font-normal">
                      ${product.price}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs ${
                        product.featured
                          ? 'bg-black text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {product.featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditingProduct(product);
                          }}
                          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-neutral-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
