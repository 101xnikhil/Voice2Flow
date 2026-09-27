import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/app/tasks';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please verify your credentials.';
      setError(message);
    }
  };

  const handleUseDemoAccount = () => {
    setEmail('demo@voice2flow.dev');
    setPassword('Voice2Flow2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[var(--bg)] px-4 py-12 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] flex items-center justify-center shadow-lg mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Welcome back to Voice2Flow
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Sign in to manage your tasks, workflows, and voice orchestration
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[#DC2626] text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              isPassword
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[var(--border)]" />
              <span className="flex-shrink mx-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                or
              </span>
              <div className="flex-grow border-t border-[var(--border)]" />
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleUseDemoAccount}
              className="w-full text-xs"
            >
              Use demo account (auto-fill)
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-[#7C5CFF] font-semibold hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
