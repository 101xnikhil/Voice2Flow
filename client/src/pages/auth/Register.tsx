import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PASSWORD_REGEX } from '@voice2flow/shared';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const detectedTimezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      : 'Asia/Kolkata';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [error, setError] = useState<string | null>(null);

  const isPasswordValid = PASSWORD_REGEX.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters and include letters and numbers');
      return;
    }

    try {
      await register({
        name,
        email,
        password,
        timezone,
      });
      navigate('/app/tasks', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please check your information.';
      setError(message);
    }
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
            Create your account
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Start organizing your tasks with Voice2Flow
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
              label="Full Name"
              type="text"
              placeholder="Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <div>
              <Input
                label="Password"
                isPassword
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <div className="mt-2 text-xs flex items-center gap-1.5 text-[var(--text-muted)]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    isPasswordValid ? 'text-[#059669]' : 'text-[var(--text-muted)]'
                  }`}
                />
                <span className={isPasswordValid ? 'text-[#059669] font-medium' : ''}>
                  Min 8 characters, letters & numbers
                </span>
              </div>
            </div>

            <Input
              label="Timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helper="Auto-detected from your browser"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Get Started
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#7C5CFF] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
