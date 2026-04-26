import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      // Mock login
      if (email === 'admin@luxe.com' && password === 'admin') {
        localStorage.setItem('user', JSON.stringify({ email, role: 'admin' }));
        navigate('/admin');
      } else {
        localStorage.setItem('user', JSON.stringify({ email, role: 'customer' }));
        navigate('/');
      }
    } else {
      // Mock registration
      localStorage.setItem('user', JSON.stringify({ email, name, role: 'customer' }));
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light tracking-tight text-black mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-neutral-600 tracking-wide">
              {isLogin ? 'Sign in to your account' : 'Join our exclusive community'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-neutral-600 hover:text-black transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" fullWidth>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-black hover:underline font-normal"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
              <p className="text-xs text-neutral-500 mb-4">Demo credentials:</p>
              <div className="space-y-2 text-xs">
                <p className="text-neutral-600">
                  Admin: <span className="font-mono bg-neutral-100 px-2 py-1 rounded">admin@luxe.com</span> /
                  <span className="font-mono bg-neutral-100 px-2 py-1 rounded ml-1">admin</span>
                </p>
                <p className="text-neutral-600">
                  Customer: any email/password
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
