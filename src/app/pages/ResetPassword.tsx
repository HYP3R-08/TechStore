import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../../lib/supabase';
import { Cpu, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if already in a recovery session (page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black mb-2">
              Reset Password
            </h1>
            <p className="text-sm text-neutral-600 tracking-wide">
              Choose a new password for your account
            </p>
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-light text-black mb-2">Password updated!</h2>
              <p className="text-sm text-neutral-600">Redirecting you to the home page...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <p className="text-sm text-neutral-500">
                Invalid or expired link.{' '}
                <a href="/forgot-password" className="text-black hover:underline">
                  Request a new one
                </a>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm text-neutral-700 tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />

                {/* Password strength hint */}
                {password.length > 0 && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= level * 3
                            ? password.length >= 12
                              ? 'bg-green-500'
                              : password.length >= 8
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Updating...' : 'Set New Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
