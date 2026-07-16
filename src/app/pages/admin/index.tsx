import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Loader2, Package, ShoppingBag, Users } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { Button } from '../../components/Button';
import { ProductsTab } from './ProductsTab';
import { OrdersTab } from './OrdersTab';
import { UsersTab } from './UsersTab';

type Tab = 'products' | 'orders' | 'users';

const TABS = [
  { id: 'products' as const, label: 'Products', icon: Package },
  { id: 'orders' as const, label: 'Orders', icon: ShoppingBag },
  { id: 'users' as const, label: 'Users', icon: Users },
];

/**
 * The redirect here is a convenience, not a security control: it keeps a
 * non-admin from staring at an empty dashboard. What actually protects the data
 * is Row Level Security — every query behind these tabs returns nothing to a
 * non-admin, whatever the browser decides to render.
 */
export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const navigate = useNavigate();
  const { isAdmin, signOut, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/auth');
  }, [authLoading, isAdmin, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // `!isAdmin` is part of the guard, not just `authLoading`: the redirect above
  // runs in an effect, so without it the dashboard shell would render for one
  // frame before navigating away.
  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-black dark:text-white mb-1">
              Admin Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm tracking-wide">
              TechStore management panel
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex gap-1 mb-8 border-b border-neutral-200 dark:border-neutral-800"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm tracking-wide transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div id={`panel-${activeTab}`} role="tabpanel">
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </div>
    </div>
  );
}
