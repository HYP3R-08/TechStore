import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase, Product, Order, Profile } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import {
  Plus, Edit2, Trash2, LogOut, Loader2, Package, ShoppingBag, Users, X,
  CheckCircle, XCircle, Truck, PackageCheck, ChevronDown, ChevronUp, Bell, Upload
} from 'lucide-react';

const CATEGORIES = ['Laptop', 'Components', 'Monitor', 'Smartphone', 'Gaming', 'Others'];
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

type Tab = 'products' | 'orders' | 'users';

type OrderWithDetails = Order & {
  profiles?: { email: string; full_name: string | null };
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    products?: { name: string };
  }>;
};

export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const navigate = useNavigate();
  const { isAdmin, signOut, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/auth');
    }
  }, [authLoading, isAdmin, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-black mb-1">Admin Dashboard</h1>
            <p className="text-neutral-600 text-sm tracking-wide">TechStore management panel</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-neutral-200">
          {[
            { id: 'products' as Tab, label: 'Products', icon: Package },
            { id: 'orders' as Tab, label: 'Orders', icon: ShoppingBag },
            { id: 'users' as Tab, label: 'Users', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm tracking-wide transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-neutral-500 hover:text-black'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    onChange([...images, ...urls]);
    setUploading(false);
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange([...images, trimmed]);
    setUrlInput('');
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <label className="block text-sm text-neutral-700 tracking-wide">
        Photos {images.length > 0 && <span className="text-neutral-400">({images.length} — first is cover)</span>}
      </label>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
              )}
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-black" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload file */}
      <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-black transition-colors text-sm text-neutral-500 hover:text-black ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Uploading...' : 'Upload from file'}
        <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </label>

      {/* Add by URL */}
      <div className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addUrl()}
          placeholder="Or paste an image URL..."
          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
        />
        <button
          onClick={addUrl}
          disabled={!urlInput.trim()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const images = editingProduct.images || [];
    const image_url = images[0] || editingProduct.image_url || '';
    if (editingProduct.id) {
      const { id, created_at, ...updates } = editingProduct as Product;
      await supabase.from('products').update({ ...updates, image_url, images }).eq('id', id);
    } else {
      await supabase.from('products').insert({
        name: editingProduct.name || '',
        price: editingProduct.price || 0,
        category: editingProduct.category || '',
        image_url,
        images,
        description: editingProduct.description || '',
        featured: editingProduct.featured || false,
        stock: editingProduct.stock || 0,
        brand: editingProduct.brand || '',
      });
    }
    setSaving(false);
    setIsEditing(false);
    setEditingProduct({});
    fetchProducts();
  };

  const openEdit = (product?: Product) => {
    setEditingProduct(product ? { ...product, images: product.images?.length ? product.images : (product.image_url ? [product.image_url] : []) } : { images: [] });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => openEdit()}>
          <Plus className="w-4 h-4 mr-2" />Add Product
        </Button>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light tracking-tight text-black">
                {editingProduct.id ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => { setIsEditing(false); setEditingProduct({}); }}>
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-4">
              <Input label="Name" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder="MacBook Pro 14&quot;" />
              <Input label="Brand" value={editingProduct.brand || ''} onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })} placeholder="Apple" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Price ($)" type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} placeholder="999" />
                <Input label="Stock" type="number" value={editingProduct.stock || ''} onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} placeholder="10" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-neutral-700 tracking-wide">Category</label>
                <select
                  value={editingProduct.category || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <ImageUploader
                images={editingProduct.images || []}
                onChange={imgs => setEditingProduct({ ...editingProduct, images: imgs })}
              />
              <div className="space-y-2">
                <label className="block text-sm text-neutral-700 tracking-wide">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editingProduct.featured || false}
                  onChange={e => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                <label htmlFor="featured" className="text-sm text-neutral-700">Featured product</label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setEditingProduct({}); }} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {['Product', 'Brand', 'Category', 'Price', 'Stock', 'Featured', ''].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded bg-neutral-100" />
                        <span className="text-sm text-black font-light">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{product.brand}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{product.category}</td>
                    <td className="px-6 py-4 text-sm text-black">${product.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{product.stock}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs ${product.featured ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                        {product.featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(product)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-neutral-600" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-16 text-neutral-500 text-sm">No products yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped:    'bg-purple-100 text-purple-800 border-purple-200',
  delivered:  'bg-green-100 text-green-800 border-green-200',
  cancelled:  'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', processing: 'Processing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};

function OrderRow({ order, onUpdate }: { order: OrderWithDetails; onUpdate: (id: string, status: Order['status']) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (status: Order['status']) => {
    setLoading(true);
    await onUpdate(order.id, status);
    setLoading(false);
  };

  return (
    <>
      <tr className={`transition-colors ${order.status === 'pending' ? 'bg-yellow-50/50' : 'hover:bg-neutral-50'}`}>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {order.status === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />}
            <span className="text-sm font-mono text-neutral-600">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-black">{order.profiles?.full_name || 'Unknown'}</div>
          <div className="text-xs text-neutral-500">{order.profiles?.email}</div>
        </td>
        <td className="px-6 py-4 text-sm text-black font-normal">${order.total.toFixed(2)}</td>
        <td className="px-6 py-4 text-sm text-neutral-500">
          {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center text-xs px-3 py-1 rounded-full border font-normal ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            {/* Action buttons based on current status */}
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => act('processing')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Accept
                </button>
                <button
                  onClick={() => act('cancelled')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}
            {order.status === 'processing' && (
              <>
                <button
                  onClick={() => act('shipped')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Mark Shipped
                </button>
                <button
                  onClick={() => act('cancelled')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}
            {order.status === 'shipped' && (
              <button
                onClick={() => act('delivered')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Mark Delivered
              </button>
            )}
            {/* Expand/collapse items */}
            <button
              onClick={() => setOpen(!open)}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {open ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded items row */}
      {open && (
        <tr className="bg-neutral-50">
          <td colSpan={6} className="px-6 py-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Order Items</p>
            <div className="space-y-2">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-black">{item.products?.name || 'Unknown product'}</span>
                  <span className="text-neutral-500">×{item.quantity} · ${item.unit_price.toFixed(2)} each</span>
                  <span className="text-black font-normal">${(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, unit_price, products(name))')
      .order('created_at', { ascending: false });

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(ordersData.map((o: any) => o.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const profileMap = Object.fromEntries(
      (profiles || []).map((p: any) => [p.id, p])
    );

    setOrders(
      ordersData.map((o: any) => ({ ...o, profiles: profileMap[o.user_id] || null })) as OrderWithDetails[]
    );
    setLoading(false);
  };

  const updateStatus = async (id: string, status: Order['status']) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return loading ? (
    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
  ) : (
    <div className="space-y-4">
      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-normal">{pendingCount} order{pendingCount > 1 ? 's' : ''}</span> waiting for your approval
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {['Order ID', 'Customer', 'Total', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map(order => (
                <OrderRow key={order.id} order={order} onUpdate={updateStatus} />
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-16 text-neutral-500 text-sm">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  };

  const updateRole = async (id: string, role: Profile['role']) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setUsers(users.map(u => u.id === id ? { ...u, role } : u));
  };

  return loading ? (
    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
  ) : (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {['Name', 'Email', 'Role', 'Joined'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-normal text-neutral-700 tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 text-sm text-black">{user.full_name || '—'}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{user.email}</td>
                <td className="px-6 py-4">
                  <select
                    value={user.role}
                    onChange={e => updateRole(user.id, e.target.value as Profile['role'])}
                    className="text-xs px-3 py-1 rounded-full border border-neutral-200 cursor-pointer bg-white"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-neutral-500 text-sm">No users yet</div>
        )}
      </div>
    </div>
  );
}
