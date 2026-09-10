'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Copy, Check, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';


interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const DEMO_CREDENTIALS = {
  email: 'marcus@rootline.app',
  password: 'journal#2026',
};

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleCopy = async (field: 'email' | 'password') => {
    const value = field === 'email' ? DEMO_CREDENTIALS.email : DEMO_CREDENTIALS.password;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback silently
    }
  };

  const autofillCredentials = () => {
    setValue('email', DEMO_CREDENTIALS.email);
    setValue('password', DEMO_CREDENTIALS.password);
  };

  const onSubmit = (data: LoginFormData) => {
    setIsLoading(true);
    // BACKEND: POST /api/auth/login with { email, password } — integrate Supabase auth here
    setTimeout(() => {
      setIsLoading(false);
      if (
        data.email === DEMO_CREDENTIALS.email &&
        data.password === DEMO_CREDENTIALS.password
      ) {
        toast.success('Welcome back, Marcus.');
        window.location.href = '/';
      } else {
        toast.error('Invalid credentials — use the demo account below to sign in.');
      }
    }, 1200);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #FAF7F0 0%, #EDE8DC 50%, #E8E0CE 100%)',
      }}
    >
      {/* Subtle ruled lines background */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, #D4C9B0 31px, #D4C9B0 32px)',
          backgroundSize: '100% 32px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo size={40} />
            <span className="font-serif text-2xl font-semibold text-primary tracking-tight">
              Rootline
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Your private space to think, plan, and grow.
          </p>
        </div>

        {/* Notebook card */}
        <div className="notebook-card overflow-hidden">
          {/* Binding */}
          <div
            className="flex items-center gap-0 px-4 py-2 border-b border-border/40"
            style={{ backgroundColor: 'rgba(92,61,46,0.04)' }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`auth-binding-${i}`}
                className="w-3 h-3 rounded-full border-2 border-border mx-2"
                style={{ backgroundColor: 'var(--background)' }}
              />
            ))}
            <span className="ml-auto text-xs text-muted-foreground font-serif italic">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </span>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-border">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={`auth-tab-${m}`}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 text-sm font-medium transition-all duration-150 ${
                  mode === m
                    ? 'text-primary border-b-2' :'text-muted-foreground hover:text-foreground'
                }`}
                style={mode === m ? { borderColor: 'var(--primary)', backgroundColor: 'rgba(92,61,46,0.04)' } : {}}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: 'var(--input)',
                  borderColor: errors.email ? 'var(--overdue)' : 'var(--border)',
                  color: 'var(--foreground)',
                }}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: 'var(--overdue)' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: 'var(--input)',
                    borderColor: errors.password ? 'var(--overdue)' : 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                  placeholder={mode === 'login' ? 'Your password' : 'Choose a strong password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: mode === 'signup'
                      ? { value: 8, message: 'Password must be at least 8 characters' }
                      : undefined,
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: 'var(--overdue)' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me (login only) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-primary"
                    {...register('rememberMe')}
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--primary)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms (signup only) */}
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                By creating an account you agree to our{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--primary)' }}>Terms of Service</span>
                {' '}and{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--primary)' }}>Privacy Policy</span>.
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                minHeight: '42px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  <PenLine size={14} />
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          {mode === 'login' && (
            <div
              className="mx-6 mb-6 p-3 rounded-lg border border-dashed"
              style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(92,61,46,0.04)' }}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  i
                </span>
                Demo account
              </p>
              <div className="space-y-1.5">
                {([
                  { key: 'email' as const, label: 'Email', value: DEMO_CREDENTIALS.email },
                  { key: 'password' as const, label: 'Password', value: DEMO_CREDENTIALS.password },
                ]).map(({ key, label, value }) => (
                  <div key={`cred-${key}`} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground">{label}: </span>
                      <span className="text-xs font-medium text-foreground font-mono">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(key)}
                      className="flex-shrink-0 p-1 rounded transition-all duration-150 hover:bg-muted/80 active:scale-95"
                      aria-label={`Copy ${label}`}
                    >
                      {copiedField === key
                        ? <Check size={11} className="text-success" />
                        : <Copy size={11} className="text-muted-foreground" />
                      }
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={autofillCredentials}
                className="mt-2 w-full py-1.5 rounded text-xs font-medium transition-all duration-150 active:scale-95 hover:opacity-90"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              >
                Autofill credentials
              </button>
            </div>
          )}
        </div>

        {/* Footer links */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium underline transition-opacity hover:opacity-80"
            style={{ color: 'var(--primary)' }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}