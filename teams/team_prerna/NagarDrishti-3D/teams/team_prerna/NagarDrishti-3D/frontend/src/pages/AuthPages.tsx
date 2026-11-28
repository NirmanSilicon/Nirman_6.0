import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn, supabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border border-charcoal/10 p-6 lg:p-8 shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-green">Sign in to NagarDrishti 3D</h1>
        <p className="text-sm text-dark-blue-grey mt-1">
          Access citizen complaint tracking, GPS evidence uploads, and role dashboards.
        </p>
      </div>

      {!supabaseConfigured && (
        <div className="rounded-lg bg-warm-ivory border border-champagne p-3 text-xs text-charcoal flex gap-2">
          <ShieldAlert className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
          <span>
            Supabase Auth keys are not set in <code>frontend/.env</code>. Configure your Supabase project first to sign in.
          </span>
        </div>
      )}

      {serverError && (
        <div className="rounded-lg bg-terracotta/10 border border-terracotta/30 p-3 text-sm text-terracotta">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:border-muted-blue"
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-terracotta mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm focus:outline-none focus:border-muted-blue"
            placeholder="••••••••"
          />
          {errors.password && <p className="text-xs text-terracotta mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !supabaseConfigured}
          className="w-full py-2.5 px-4 rounded-lg bg-champagne text-charcoal font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs text-muted-blue pt-2 border-t border-charcoal/10">
        <Link to="/register" className="hover:underline">Create an account</Link>
        <Link to="/forgot-password" className="hover:underline">Forgot password?</Link>
      </div>
    </div>
  );
}

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(120),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Use at least 8 characters'),
  requestedRole: z.enum(['citizen', 'officer', 'contractor']),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { signUp, supabaseConfigured } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { requestedRole: 'citizen' },
  });

  const onSubmit = async (values: RegisterValues) => {
    setErrorMsg(null);
    setMessage(null);
    try {
      const res = await signUp(values);
      setMessage(
        res.needsEmailConfirmation
          ? 'Registration submitted. Please check your inbox and verify your email address before signing in.'
          : 'Account created successfully.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border border-charcoal/10 p-6 lg:p-8 shadow-sm space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-forest-green">Create Account</h1>
        <p className="text-sm text-dark-blue-grey mt-1">
          Officer and Contractor requests start with Citizen access until verified and approved by an Administrator.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-terracotta/10 border border-terracotta/30 p-3 text-sm text-terracotta">
          {errorMsg}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-success-green/10 border border-success-green/30 p-3 text-sm text-success-green">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            {...register('fullName')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            placeholder="Ananya Patnaik"
          />
          {errors.fullName && <p className="text-xs text-terracotta mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-terracotta mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            placeholder="Minimum 8 characters"
          />
          {errors.password && <p className="text-xs text-terracotta mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Type</label>
          <select
            {...register('requestedRole')}
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm bg-white"
          >
            <option value="citizen">Citizen (Immediate access after email verification)</option>
            <option value="officer">Government Officer (Requires Admin approval)</option>
            <option value="contractor">Contractor (Requires Admin approval)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !supabaseConfigured}
          className="w-full py-2.5 px-4 rounded-lg bg-champagne text-charcoal font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <div className="text-xs text-muted-blue pt-2 border-t border-charcoal/10">
        Already registered? <Link to="/login" className="hover:underline font-medium">Sign in</Link>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await requestPasswordReset(email);
      setStatus('If an account exists for that email, a password reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border border-charcoal/10 p-6 lg:p-8 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-forest-green">
        <KeyRound className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Reset Password</h1>
      </div>
      {error && <p className="text-sm text-terracotta">{error}</p>}
      {status && <p className="text-sm text-success-green">{status}</p>}
      <form onSubmit={handleReset} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Registered email"
          className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-lg bg-champagne text-charcoal font-semibold text-sm"
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg('Password updated. Redirecting to sign in...');
    setTimeout(() => navigate('/login'), 1500);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border border-charcoal/10 p-6 lg:p-8 shadow-sm space-y-4">
      <h1 className="text-xl font-semibold text-forest-green">Set New Password</h1>
      {err && <p className="text-sm text-terracotta">{err}</p>}
      {msg && <p className="text-sm text-success-green">{msg}</p>}
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-lg bg-champagne text-charcoal font-semibold text-sm"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
