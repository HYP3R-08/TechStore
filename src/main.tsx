import { createRoot } from 'react-dom/client';
import App from './app/App';
import { AuthProvider } from './lib/AuthContext';
import { CartProvider } from './lib/CartContext';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in index.html');

createRoot(container).render(
  <AuthProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </AuthProvider>
);
