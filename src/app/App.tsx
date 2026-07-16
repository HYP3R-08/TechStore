import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';

/** Reads the theme from context, so toasts follow light/dark like the rest of the UI. */
function Notifications() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-center" richColors closeButton />;
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Notifications />
    </ThemeProvider>
  );
}
