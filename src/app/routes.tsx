import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Auth } from './pages/Auth';
import { Account } from './pages/Account';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CheckoutSuccess } from './pages/CheckoutSuccess';
import { Checkout } from './pages/Checkout';
import { NewArrivals } from './pages/NewArrivals';
import { Support } from './pages/Support';
import { Company } from './pages/Company';
import { NotFound } from './pages/NotFound';

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
      { path: 'account', Component: Account },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'reset-password', Component: ResetPassword },
      { path: 'checkout', Component: Checkout },
      { path: 'checkout/success', Component: CheckoutSuccess },
      { path: 'new-arrivals', Component: NewArrivals },
      { path: 'support', Component: Support },
      { path: 'company', Component: Company },
      {
        // The dashboard is the largest part of the app and almost no visitor
        // opens it, so it is fetched only when someone navigates here. React
        // Router owns the loading state, so no Suspense boundary is needed.
        path: 'admin',
        lazy: async () => {
          const { Admin } = await import('./pages/admin');
          return { Component: Admin };
        },
      },
      { path: '*', Component: NotFound },
    ],
  },
]);
