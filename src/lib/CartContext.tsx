// The provider ships alongside its hook and key helper on purpose: they are one
// unit, and splitting them across files only to satisfy Fast Refresh would trade
// readability for a dev-only convenience. The cost is that editing this file
// reloads the page instead of hot-swapping it.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, type CartItem, type Product } from './supabase';
import { shippingFor } from './pricing';

/**
 * The cart, owned in one place.
 *
 * Three things this centralises, each of which is easy to get subtly wrong when
 * the cart is read straight from localStorage at every call site:
 *
 *   1. localStorage is user-writable and can hold anything, so every read is
 *      guarded — a malformed value must not take the page down.
 *   2. A line is a product *and* a variant. Addressing lines by product id alone
 *      makes the same product in two colours behave as one.
 *   3. The stored cart is a snapshot from whenever the item was added, so prices
 *      and stock are reconciled against the database on load. Otherwise the
 *      displayed total can drift from what the server actually charges.
 */

const STORAGE_KEY = 'cart';

/** A line is a product *and* a variant: the same product in two colours is two lines. */
export function cartKey(productId: string, variantIndex: number | null | undefined): string {
  return `${productId}:${variantIndex ?? 'default'}`;
}

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // localStorage is user-writable, so treat it as untrusted input.
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CartItem).id === 'string' &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).quantity > 0
    );
  } catch {
    return [];
  }
}

function writeStoredCart(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private browsing or a full quota: the cart stays in memory for this
    // session rather than taking the page down.
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  addItem: (product: Product, variantIndex?: number | null, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    writeStoredCart(next);
  }, []);

  // Refresh names, prices, stock and images from the database once on load: a
  // stored cart can be days old. Lines whose product no longer exists are
  // dropped, and quantities are clamped to what is actually in stock.
  useEffect(() => {
    const stored = readStoredCart();
    if (stored.length === 0) return;

    let cancelled = false;
    (async () => {
      const ids = [...new Set(stored.map((i) => i.id))];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', ids);

      if (cancelled || error || !data) return;

      const fresh = new Map((data as Product[]).map((p) => [p.id, p]));
      const reconciled = stored
        .filter((item) => fresh.has(item.id))
        .map((item) => {
          const product = fresh.get(item.id)!;
          return {
            ...product,
            quantity: Math.min(item.quantity, Math.max(product.stock, 0)),
            variantIndex: item.variantIndex ?? null,
          };
        })
        .filter((item) => item.quantity > 0);

      persist(reconciled);
    })();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  // Keep other tabs of the same site in step. This is the browser's own storage
  // event, which fires only for *other* documents.
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStoredCart());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const addItem = useCallback(
    (product: Product, variantIndex: number | null = null, quantity = 1) => {
      if (product.stock <= 0) return;

      const key = cartKey(product.id, variantIndex);
      const existing = items.find((i) => cartKey(i.id, i.variantIndex) === key);

      const next = existing
        ? items.map((i) =>
            cartKey(i.id, i.variantIndex) === key
              ? { ...i, quantity: Math.min(product.stock, i.quantity + quantity) }
              : i
          )
        : [...items, { ...product, quantity: Math.min(product.stock, quantity), variantIndex }];

      persist(next);
    },
    [items, persist]
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      persist(
        items.map((i) =>
          cartKey(i.id, i.variantIndex) === key
            ? { ...i, quantity: Math.min(i.stock, Math.max(1, quantity)) }
            : i
        )
      );
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (key: string) => {
      persist(items.filter((i) => cartKey(i.id, i.variantIndex) !== key));
    },
    [items, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = shippingFor(subtotal);
    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [items, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
