import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { UserRole, GenderOption } from '../../types';
import {
  PasswordRequirementsChecklist,
  evaluatePasswordRequirements,
} from './PasswordRequirementsChecklist';
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  AlertCircle,
  Building2,
  Compass,
  CalendarCheck,
  Zap,
} from 'lucide-react';

interface AuthRequiredModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  customMessage?: string;
  initialMode?: 'LOGIN' | 'REGISTER';
  onSuccess?: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  customMessage,
  initialMode = 'REGISTER',
  onSuccess,
}) => {
  const {
    user,
    isAuthenticated,
    isAuthPromptOpen,
    authPromptMessage,
    authModalInitialMode,
    closeAuthPrompt,
    login,
    register,
    demoAccounts,
    loginAsDemo,
    accountExists,
  } = useAuth();
  const { setRole } = useAccessibility();

  // Modal visibility
  const showModal = isOpen !== undefined ? isOpen : isAuthPromptOpen;
  const activeClose = onClose || closeAuthPrompt;
  const activeMessage =
    customMessage ||
    authPromptMessage ||
    'Please sign in or register to book your trip and calculate verified accessible routes.';

  // Mode: 'REGISTER' | 'LOGIN' | 'DEMO'
  const [mode, setMode] = useState<'REGISTER' | 'LOGIN' | 'DEMO'>(
    initialMode || authModalInitialMode || 'REGISTER'
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderOption>('FEMALE');
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});

  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([
    'Wheelchair (0-Stairs)',
    '1:12 Ramp Slope',
    'Accessible Restroom',
  ]);

  if (!showModal || isAuthenticated) {
    return null;
  }

  // Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() !== '' && emailRegex.test(email.trim());
  const passwordRequirements = evaluatePasswordRequirements(password);
  const isPasswordStrong = passwordRequirements.every((r) => r.met);
  const isNameValid = name.trim().length >= 2;

  const handleNeedToggle = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setErrorMsg(null);

    if (!isEmailValid || !password) {
      return;
    }

    const exists = accountExists(email.trim());
    if (!exists) {
      setErrorMsg(`No account found for "${email.trim()}". Please click 'Register' to create your account.`);
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password, selectedRole);
      setRole(selectedRole);
      setSuccessMsg('Signed in successfully! Returning to your booking...');
      setTimeout(() => {
        activeClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      if (err?.message?.includes('INVALID_PASSWORD')) {
        setErrorMsg('Incorrect password. Please enter the password you registered with.');
      } else {
        setErrorMsg(err?.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setErrorMsg(null);

    if (!isNameValid || !isEmailValid || !isPasswordStrong) {
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, selectedRole, selectedNeeds, gender);
      setRole(selectedRole);
      setSuccessMsg('🎉 Account registered successfully and password saved! Proceeding to your trip...');
      setTimeout(() => {
        activeClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoId: string) => {
    loginAsDemo(demoId);
    setSuccessMsg('Demo explorer activated! You can now plan trips and book stays.');
    setTimeout(() => {
      activeClose();
      if (onSuccess) onSuccess();
    }, 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Top Header Banner with Vibrant Contrast */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 text-white relative overflow-hidden">
          {/* Ambient Glow Circles */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black shadow-lg shrink-0 ring-2 ring-white/30">
                <Lock className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>Compulsory Step</span>
                </div>
                <h2 id="auth-required-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Sign In or Register to Book Your Trip
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                  {activeMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={activeClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-black/30 backdrop-blur-md rounded-2xl border border-white/20 relative z-10">
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'REGISTER'
                  ? 'bg-white text-blue-900 shadow-md ring-1 ring-white/50'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-white text-blue-900 shadow-md ring-1 ring-white/50'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('DEMO');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'DEMO'
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-amber-300'
                  : 'text-amber-200 hover:text-amber-100 hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1-Click Demo</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Alerts / Error Feedback */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{errorMsg}</span>
                {mode === 'LOGIN' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('REGISTER');
                        setErrorMsg(null);
                      }}
                      className="font-bold underline text-blue-600 dark:text-blue-400"
                    >
                      Click here to Register an account now →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: REGISTRATION FORM */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {touched.name && !isNameValid && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">Please enter your full name (minimum 2 letters).</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="e.g. name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {touched.email && !isEmailValid && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">Please enter a valid email address.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    placeholder="Enter a secure password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="pt-2">
                  <PasswordRequirementsChecklist
                    requirements={passwordRequirements}
                    theme="light"
                  />
                </div>
              </div>

              {/* Accessibility Preferences for Routing */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Accessibility Routing Requirements:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Wheelchair (0-Stairs)',
                    '1:12 Ramp Slope',
                    'Accessible Restroom',
                    'Audio Guidance',
                    'PRM Station Escort',
                  ].map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNeeds.includes(item)}
                        onChange={() => handleNeedToggle(item)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Registering Your Account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Registration & Book Trip</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SIGN IN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="e.g. alex.rivera@accessway.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember my session</span>
                </label>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SSL Certified
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In & Continue Booking</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-500">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  Register in 30 seconds
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: 1-CLICK DEMO ACCOUNTS */}
          {mode === 'DEMO' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose a pre-configured verified traveler or auditor profile to immediately explore with full booking & route planning privileges:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {demoAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleDemoLogin(account.id)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 dark:hover:border-blue-400 text-left transition-all group cursor-pointer hover:shadow-md flex items-start gap-3"
                  >
                    <img
                      src={account.avatarUrl}
                      alt={account.name}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {account.name}
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {account.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {account.badge}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Instant 1-Click Login</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Zero-Hallucination Verified Data</span>
          </div>
          <span>Sugamya Accessible Network</span>
        </div>

      </div>
    </div>
  );
};
