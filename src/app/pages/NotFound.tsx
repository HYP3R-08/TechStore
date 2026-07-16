import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center px-4">
        <h1 className="text-4xl font-light tracking-tight text-black dark:text-white mb-4">404</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">Page not found</p>
        <Link to="/" className="text-sm text-black dark:text-white hover:underline">
          Return to home
        </Link>
      </div>
    </div>
  );
}
