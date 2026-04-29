import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Auth } from './pages/Auth';
import { Admin } from './pages/Admin';
import { Account } from './pages/Account';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CheckoutSuccess } from './pages/CheckoutSuccess';
import { NewArrivals } from './pages/NewArrivals';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'products', Component: Products },
      { path: 'product/:id', Component: ProductDetail },
      { path: 'cart', Component: Cart },
      { path: 'auth', Component: Auth },
      { path: 'admin', Component: Admin },
      { path: 'account', Component: Account },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'reset-password', Component: ResetPassword },
      { path: 'checkout/success', Component: CheckoutSuccess },
      { path: 'new-arrivals', Component: NewArrivals },
      {
        path: '*',
        Component: () => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-light tracking-tight text-black mb-4">404</h1>
              <p className="text-neutral-600 mb-8">Page not found</p>
              <a href="/" className="text-sm text-black hover:underline">Return to home</a>
            </div>
          </div>
        )
      }
    ]
  }
]);
