import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { UserRole, GenderOption } from '../../types';
import { AccessWayLogo } from '../common/AccessWayLogo';
import {
  PasswordRequirementsChecklist,
  evaluatePasswordRequirements,
} from './PasswordRequirementsChecklist';
import {
  User,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Compass,
  MapPin,
  Check,
  Shield,
  Layers,
  Heart,
  Globe2,
  Tv,
  AlertCircle,
} from 'lucide-react';

interface AuthPageProps {
  onSuccess?: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  isModal?: boolean;
}

const VIDEO_SCENES = [
  {
    id: 'transit',
    title: 'Metro & Step-Free Transit',
    description: 'Smooth elevator access, level-boarding trains and barrier-free stations',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-train-passing-by-a-station-platform-41018-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    accentColor: 'from-blue-600 to-cyan-600',
    stats: '99.8% Step-Free Reliability',
  },
  {
    id: 'heritage',
    title: 'Heritage & World Wonders',
    description: '1:12 slope ramp verification at Taj Mahal, Qutub Minar & ancient monuments',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-modern-architecture-building-42866-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80',
    accentColor: 'from-amber-600 to-orange-600',
    stats: '200+ Audited Monuments',
  },
  {
    id: 'urban',
    title: 'Smart City Mobility',
    description: 'Tactile paving, zero-curb pedestrian walkways & live audio street beacons',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-city-streets-with-people-and-traffic-41618-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80',
    accentColor: 'from-emerald-600 to-teal-600',
    stats: 'Real-Time Crowd & Lift Feeds',
  },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  initialMode = 'LOGIN',
  isModal = false,
}) => {
  const { user, isAuthenticated, login, register, demoAccounts, loginAsDemo, accountExists } = useAuth();
  const { setRole } = useAccessibility();

  // Mode: LOGIN or REGISTER
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderOption>('FEMALE');
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [noAccountWarning, setNoAccountWarning] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // Selected Accommodations for sign up
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([
    'Wheelchair (0-Stairs)',
    '1:12 Ramp Slope',
    'Accessible Restroom',
  ]);

  // Password validation
  const passwordRequirements = evaluatePasswordRequirements(password);
  const isPasswordStrong = passwordRequirements.every((r) => r.met);

  // Video Background Controls
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentScene = VIDEO_SCENES[activeSceneIndex];

  // Auto-switch background scenes every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSceneIndex((prev) => (prev + 1) % VIDEO_SCENES.length);
      setVideoError(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeSceneIndex]);

  // Auto-play / play state handle
  useEffect(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.play().catch(() => {
          // Auto-play was prevented; fallback to poster gracefully
          setIsVideoPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideoPlaying, activeSceneIndex]);

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    }
  };

  const handleNeedToggle = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setNoAccountWarning(null);
    setPasswordError(null);

    // Check account exists
    const exists = accountExists(email.trim());
    if (!exists) {
      setNoAccountWarning(email.trim());
      return;
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password, selectedRole);
      setRole(selectedRole);
      setAuthSuccessMsg(`Welcome back to AccessWay!`);
      setTimeout(() => {
        setAuthSuccessMsg('');
        if (onSuccess) onSuccess();
      }, 800);
    } catch (err: any) {
      if (err?.message?.includes('NO_ACCOUNT_FOUND')) {
        setNoAccountWarning(email.trim());
      } else if (err?.message?.includes('INVALID_PASSWORD')) {
        setPasswordError(`Incorrect password. Please enter the password you registered with.`);
      } else if (err?.message?.includes('PASSWORD_REQUIRED')) {
        setPasswordError('Please enter the password for this account.');
      } else {
        setPasswordError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !isPasswordStrong) return;
    setNoAccountWarning(null);
    setPasswordError(null);
    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, selectedRole, selectedNeeds, gender);
      setRole(selectedRole);
      setAuthSuccessMsg(`Account created and password saved! Welcome to AccessWay, ${name}.`);
      setTimeout(() => {
        setAuthSuccessMsg('');
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      setPasswordError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = (demoId: string) => {
    loginAsDemo(demoId);
    const acc = demoAccounts.find((a) => a.id === demoId);
    if (acc) {
      setRole(acc.role);
      setAuthSuccessMsg(`Logged in as ${acc.name} (${acc.role})`);
      setTimeout(() => {
        setAuthSuccessMsg('');
        if (onSuccess) onSuccess();
      }, 700);
    }
  };

  return (
    <div className={`w-full ${isModal ? 'max-h-[85vh]' : 'min-h-[85vh]'} flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all`}>
      
      {/* ========================================================
          LEFT: CINEMATIC VIDEO ANIMATION SHOWCASE
          ======================================================== */}
      <div className="relative lg:w-1/2 min-h-[300px] lg:min-h-[640px] bg-slate-950 flex flex-col justify-between p-6 sm:p-8 overflow-hidden text-white group">
        
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0">
          {!videoError ? (
            <video
              ref={videoRef}
              key={currentScene.videoUrl}
              autoPlay
              loop
              muted={isVideoMuted}
              playsInline
              poster={currentScene.posterUrl}
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover opacity-65 scale-105 transition-transform duration-1000 ease-out group-hover:scale-100 filter brightness-90 contrast-105"
            >
              <source src={currentScene.videoUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={currentScene.posterUrl}
              alt={currentScene.title}
              className="w-full h-full object-cover opacity-60 filter brightness-90"
            />
          )}

          {/* Cinematic Gradients & Particle Mesh Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60" />
        </div>

        {/* Top Video Header / Branding */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AccessWayLogo variant="full" size="sm" darkContrast={true} />
          </div>

          {/* Video Playback & Mute Controls */}
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
            <button
              onClick={toggleVideoPlayback}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isVideoPlaying ? 'Pause Video Animation' : 'Play Video Animation'}
              aria-label="Toggle Video"
            >
              {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>
            <button
              onClick={() => setIsVideoMuted(!isVideoMuted)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isVideoMuted ? 'Unmute Video' : 'Mute Video'}
              aria-label="Toggle Video Audio"
            >
              {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Middle Floating Feature Glass Card */}
        <div className="relative z-10 my-auto py-6 space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold backdrop-blur-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentScene.stats}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md leading-tight">
            Explore the World with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">Guaranteed Step-Free</span> Mobility.
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed drop-shadow-sm">
            {currentScene.description}
          </p>

          {/* Quick Floating Live Trust Badges */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ISO 21542 Certified</span>
              </div>
              <p className="text-[11px] text-slate-300">Audited ramp slopes & 900mm doors</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-0.5">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supabase Cloud Sync</span>
              </div>
              <p className="text-[11px] text-slate-300">Offline PDF travel passes & hotel PINs</p>
            </div>
          </div>
        </div>

        {/* Bottom Scene Switcher Chips */}
        <div className="relative z-10 space-y-2 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Tv className="w-3.5 h-3.5" />
              <span>Animated Video Backdrops:</span>
            </span>
            <span>Scene {activeSceneIndex + 1} of {VIDEO_SCENES.length}</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {VIDEO_SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                onClick={() => {
                  setActiveSceneIndex(idx);
                  setVideoError(false);
                  setIsVideoPlaying(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeSceneIndex === idx
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                <span>{idx === 0 ? '🚆' : idx === 1 ? '🏛️' : '🏙️'}</span>
                <span>{scene.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT: AUTHENTICATION FORM (SIGN IN & REGISTER)
          ======================================================== */}
      <div className="lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* Auth Toggle Tabs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {authMode === 'LOGIN' ? 'Welcome Back!' : 'Join AccessWay'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {authMode === 'LOGIN'
                  ? 'Sign in to access your offline passes, saved routes & bookings'
                  : 'Create a free account with your personalized accessibility profile'}
              </p>
            </div>

            {/* Mode Switcher Pill */}
            <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('LOGIN');
                  setNoAccountWarning(null);
                  setPasswordError(null);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  authMode === 'LOGIN'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setNoAccountWarning(null);
                  setPasswordError(null);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  authMode === 'REGISTER'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Warning Banner when no account exists */}
          {noAccountWarning && authMode === 'LOGIN' && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500/80 text-amber-900 dark:text-amber-200 text-xs shadow-lg animate-in fade-in space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs mt-0.5">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="font-bold text-amber-950 dark:text-amber-100 text-xs">
                    No account found for "{noAccountWarning}"
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    You must register an account first before signing in.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end pt-1 border-t border-amber-200 dark:border-amber-900/50">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('REGISTER');
                    setNoAccountWarning(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register First</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {authSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={authMode === 'LOGIN' ? handleLoginSubmit : handleRegisterSubmit}
            className="space-y-4"
          >
            {/* Registration: Name Field */}
            {authMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Registration: Gender Field */}
            {authMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { value: 'FEMALE', label: 'Female', icon: '👩' },
                    { value: 'MALE', label: 'Male', icon: '👨' },
                    { value: 'NON_BINARY', label: 'Non-Binary', icon: '🧑' },
                    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say', icon: '🔒' },
                    { value: 'OTHER', label: 'Other', icon: '✨' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value as GenderOption)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                        gender === opt.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                      aria-pressed={gender === opt.value}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <span className="text-[10px] font-bold truncate leading-tight w-full">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. traveler@accessway.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                {authMode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('alex.rivera@accessway.org');
                      setPassword('Alex@AccessWay2026!');
                      setPasswordError(null);
                      setNoAccountWarning(null);
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Auto-fill demo credentials
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Error Alert */}
              {passwordError && (
                <div
                  role="alert"
                  className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="space-y-0.5 flex-1">
                    <p>{passwordError}</p>
                    {authMode === 'LOGIN' && (
                      <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 font-normal">
                        Tip: While signing in, you must use the exact password you created when registering.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Password Requirements: ONLY for Registration */}
              {authMode === 'REGISTER' && (
                <div className="pt-1">
                  <PasswordRequirementsChecklist
                    requirements={passwordRequirements}
                    theme="light"
                  />
                </div>
              )}
            </div>

            {/* Registration Accessibility Accommodations */}
            {authMode === 'REGISTER' && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Your Accessibility Accommodations:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Wheelchair (0-Stairs)',
                    '1:12 Ramp Slope',
                    'Accessible Restroom',
                    'Audio Guidance',
                    'Tactile Signage',
                    'Quiet / Low Crowd',
                  ].map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-blue-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNeeds.includes(item)}
                        onChange={() => handleNeedToggle(item)}
                        className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] truncate">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Remember this device</span>
              </label>

              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Supabase Secure Vault</span>
              </span>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg hover:shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Authenticating account...</span>
              ) : authMode === 'LOGIN' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to AccessWay</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create My Universal Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 1-Click Demo Profiles */}
        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant 1-Click Evaluation Sign In</span>
            </span>
            <span className="text-[11px] text-blue-600 font-semibold">1-Click Test</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoAccounts.slice(0, 4).map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleDemoSelect(acc.id)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all text-left flex items-center gap-2.5 group shadow-2xs"
              >
                <img
                  src={acc.avatarUrl}
                  alt={acc.name}
                  className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {acc.name}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                    {acc.badge}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
