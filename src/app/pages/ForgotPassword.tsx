import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../../lib/supabase';
import { Cpu, ArrowLeft, Mail } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-black dark:text-white mb-2">
              Forgot Password
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 tracking-wide">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-light text-black dark:text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                We sent a password reset link to <span className="text-black dark:text-white font-normal">{email}</span>
              </p>
              <Link to="/auth" className="text-sm text-black dark:text-white hover:underline">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
