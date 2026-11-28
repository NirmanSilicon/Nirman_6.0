import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Eye, EyeOff, ArrowRight, Sparkles, Zap } from 'lucide-react';
import {
  CoralTriangle,
  TealQuarterArc,
  MustardDottedCircle,
  VioletPlus,
  BlackSquiggle,
  SkyZigzag,
} from '../components/ui/MemphisShapes';
import { useVidyut } from '../context/VidyutContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useVidyut();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both your work email and password.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const displayName = email.split('@')[0].replace(/[._-]/g, ' ');
      login({
        name: displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
        email: email.trim(),
        role: 'Shift A · Operator',
        isDemo: false,
      });
      setSubmitting(false);
      navigate('/', { replace: true });
    }, 250);
  };

  const handleDemoLogin = () => {
    setFormError('');
    setSubmitting(true);
    setTimeout(() => {
      login({
        name: 'Plant Ops Lead',
        email: 'demo.ops@vidyutsync.in',
        role: 'Shift A · Demo Supervisor',
        isDemo: true,
      });
      setSubmitting(false);
      navigate('/', { replace: true });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#E3D6BF] text-[#17140D] relative overflow-x-hidden flex flex-col justify-between p-4 sm:p-8">
      {/* Decorative Memphis Elements */}
      <CoralTriangle className="fixed top-10 right-10 w-14 h-14 z-0 animate-memphis-drift hidden md:block" />
      <TealQuarterArc className="fixed bottom-10 left-8 w-16 h-16 z-0 animate-memphis-bob hidden md:block" />
      <MustardDottedCircle className="fixed top-1/2 left-6 w-12 h-12 z-0 animate-memphis-spin hidden lg:block" />
      <VioletPlus className="fixed bottom-14 right-16 w-11 h-11 z-0 animate-memphis-sway hidden md:block" />

      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#933B5B] text-white border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          Shift, don&apos;t cut.
        </span>
        <Link
          to="/register"
          className="memphis-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-xs font-extrabold text-[#17140D]"
        >
          Create Account
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Two-Column Auth Layout */}
      <div className="max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Column: Brand & Storytelling */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#933B5B] text-white border-[3px] border-[#17140D] shadow-[4px_4px_0_#17140D] flex items-center justify-center">
              <Sun className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display text-2xl font-extrabold tracking-tight block leading-none">
                VidyutSync
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                Multi-Agent Energy OS
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.08] text-[#17140D]">
              Welcome back to a{' '}
              <span className="inline-block bg-[#933B5B] text-white px-2.5 py-0.5 border-2 border-[#17140D] rounded-lg">
                smarter
              </span>{' '}
              factory.
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#933B5B] max-w-md leading-relaxed">
              Coordinate CNC, stamping, and thermal production schedules with rooftop solar peaks, battery storage, and worker comfort.
            </p>
          </div>

          {/* Flat Vector Product Mini-Preview */}
          <div className="bg-white rounded-[18px] border-[3px] border-[#17140D] shadow-[6px_6px_0_#17140D] p-4 max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#933B5B]">
                4 Cooperative Agents
              </span>
              <SkyZigzag className="w-16 h-5" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="p-2.5 rounded-[10px] bg-[#933B5B]/20 border-2 border-[#17140D]">
                Grid &amp; Carbon
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D]">
                Microgrid &amp; Storage
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#E3D6BF] border-2 border-[#17140D]">
                Production Scheduling
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D]">
                Ergonomics &amp; Shift
              </div>
            </div>
            <BlackSquiggle className="w-24 h-4 opacity-70" />
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="w-full max-w-md mx-auto lg:ml-auto">
          <div className="bg-white rounded-[22px] border-[3px] border-[#17140D] shadow-[8px_8px_0_#17140D] p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="font-display text-2xl font-extrabold text-[#17140D]">
                Sign in to VidyutSync
              </h2>
              <p className="text-xs font-medium text-[#933B5B] mt-1">
                Sign in with your operator account or use one-click demo access.
              </p>
            </div>

            {/* One-Click Demo Access Banner */}
            <div className="mb-5 p-3.5 rounded-[14px] bg-[#E3D6BF] border-2 border-[#17140D] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#933B5B]">Demo Account Ready</span>
                <span className="font-mono text-[11px] font-bold text-[#933B5B]">
                  demo.ops@vidyutsync.in
                </span>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={submitting}
                className="memphis-btn w-full py-2.5 bg-[#933B5B] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-4 h-4" />
                One-Click Demo Login (Plant Ops Lead)
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[12px] bg-[#933B5B] text-white border-2 border-[#17140D] text-xs font-bold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-extrabold text-[#17140D] mb-1.5"
                >
                  Work Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops.lead@puneprecision.in"
                  className="w-full px-3.5 py-2.5 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-extrabold text-[#17140D] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#17140D] hover:text-[#933B5B] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 font-bold text-[#17140D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#933B5B] rounded border-2 border-[#17140D]"
                  />
                  Remember me
                </label>
                <span className="font-bold text-[#933B5B]">Shift A · Operator Access</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="memphis-btn w-full py-3 bg-[#933B5B] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Log in'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t-2 border-[#E3D6BF] text-center text-xs font-medium text-[#933B5B]">
              New to VidyutSync?{' '}
              <Link to="/register" className="font-extrabold text-[#17140D] underline decoration-2 decoration-[#933B5B]">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-center text-[11px] font-bold text-[#933B5B] relative z-10">
        VidyutSync Industrial Energy Platform · Ready for backend authentication integration
      </div>
    </div>
  );
}
