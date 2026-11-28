import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2, Zap } from 'lucide-react';
import {
  CoralTriangle,
  TealQuarterArc,
  MustardDottedCircle,
  VioletPlus,
  MustardHalfCircle,
} from '../components/ui/MemphisShapes';
import { useVidyut } from '../context/VidyutContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login, register } = useVidyut();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setFormError('Please accept the terms and conditions to continue.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      register({
        name: fullName.trim(),
        email: email.trim(),
        company: company.trim(),
      });
      setSubmitting(false);
      navigate('/', { replace: true });
    }, 250);
  };

  const handleDemoAccess = () => {
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
      <MustardHalfCircle className="fixed top-8 right-12 w-20 h-12 z-0 animate-memphis-bob hidden md:block" />
      <CoralTriangle className="fixed bottom-12 left-10 w-14 h-14 z-0 animate-memphis-drift hidden md:block" />
      <TealQuarterArc className="fixed top-1/2 left-6 w-14 h-14 z-0 hidden lg:block" />
      <VioletPlus className="fixed bottom-16 right-12 w-10 h-10 z-0 animate-memphis-sway hidden md:block" />

      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E3D6BF] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          Run when the sun shines
        </span>
        <Link
          to="/login"
          className="memphis-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-xs font-extrabold text-[#17140D]"
        >
          Sign In
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Two-Column Auth Layout */}
      <div className="max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Column */}
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
              Build a{' '}
              <span className="inline-block bg-[#933B5B] text-white px-2.5 py-0.5 border-2 border-[#17140D] rounded-lg">
                smarter,
              </span>{' '}
              cleaner factory.
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#933B5B] max-w-md leading-relaxed">
              Synchronize heavy manufacturing loads with solar generation and Time-of-Use tariffs—cutting emissions and electricity bills without missing a single shipment.
            </p>
          </div>

          <div className="space-y-2.5 max-w-md">
            {[
              'Real-time Sense → Connect → Decide → Act & Observe loop',
              'Human-in-the-loop AI schedule recommendations',
              'Ergonomic shift & battery reserve protection',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-[12px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4 text-[#933B5B] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <MustardDottedCircle className="w-14 h-14 animate-memphis-spin hidden sm:block" />
        </div>

        {/* Right Column: Registration Card */}
        <div className="w-full max-w-md mx-auto lg:ml-auto">
          <div className="bg-white rounded-[22px] border-[3px] border-[#17140D] shadow-[8px_8px_0_#17140D] p-6 sm:p-8">
            <div className="mb-4">
              <h2 className="font-display text-2xl font-extrabold text-[#17140D]">
                Create your account
              </h2>
              <p className="text-xs font-medium text-[#933B5B] mt-1">
                Set up operator access for your manufacturing facility.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={submitting}
              className="memphis-btn mb-4 w-full py-2.5 bg-[#933B5B] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Zap className="w-4 h-4" />
              One-Click Demo Access (Skip Registration)
            </button>

            {formError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[12px] bg-[#933B5B] text-white border-2 border-[#17140D] text-xs font-bold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-extrabold text-[#17140D] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ankit Sharma"
                  className="w-full px-3.5 py-2 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-extrabold text-[#17140D] mb-1"
                >
                  Work Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ankit@puneprecision.in"
                  className="w-full px-3.5 py-2 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="reg-company"
                  className="block text-xs font-extrabold text-[#17140D] mb-1"
                >
                  Company / Factory Name
                </label>
                <input
                  id="reg-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Pune Precision Plant — Unit 04"
                  className="w-full px-3.5 py-2 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-extrabold text-[#17140D] mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2 pr-10 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
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

              <div>
                <label
                  htmlFor="reg-confirm"
                  className="block text-xs font-extrabold text-[#17140D] mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2 rounded-[12px] border-2 border-[#17140D] bg-[#E3D6BF] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#933B5B]"
                  required
                />
              </div>

              <label className="flex items-start gap-2 pt-1 text-xs font-medium text-[#17140D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#933B5B] rounded border-2 border-[#17140D]"
                />
                <span>
                  I agree to the VidyutSync operational terms &amp; human-in-the-loop safety policy.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="memphis-btn w-full py-3 bg-[#933B5B] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Creating account...' : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-5 pt-4 border-t-2 border-[#E3D6BF] text-center text-xs font-medium text-[#933B5B]">
              Already have an account?{' '}
              <Link to="/login" className="font-extrabold text-[#17140D] underline decoration-2 decoration-[#E3D6BF]">
                Sign in
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
