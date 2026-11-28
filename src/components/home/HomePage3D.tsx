import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole, GenderOption } from '../../types';
import { AccessWayLogo } from '../common/AccessWayLogo';
import {
  PasswordRequirementsChecklist,
  evaluatePasswordRequirements,
} from '../auth/PasswordRequirementsChecklist';
import {
  Compass,
  MapPin,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Globe2,
  LogIn,
  UserPlus,
  Plane,
  Luggage,
  Shield,
  Layers,
  Sparkle,
  Navigation,
  ChevronRight,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface HomePage3DProps {
  onEnterWebsite: () => void;
}

// 3D Travel Environments with rich high-res travel scenery and depth layers
const TRAVEL_SCENES = [
  {
    id: 'wonders',
    name: 'Heritage World Wonders',
    location: 'Taj Mahal & Agra Fort',
    tagline: 'Audited 1:12 Ramp Slopes & Zero-Stair Royal Courtyards',
    bgImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=2000&q=85',
    accentColor: 'from-amber-500/30 to-orange-600/30',
    borderColor: 'border-amber-400/40',
    tags: ['Taj Mahal • UNESCO', 'Priority PRM Buggy', 'Tactile Audio Path'],
    marker1: { x: 30, y: 38, label: 'Royal Gate • Zero-Stair Access', icon: '🏛️' },
    marker2: { x: 70, y: 55, label: 'Main Dome • 1:12 Ramp Slope', icon: '♿' },
  },
  {
    id: 'alps',
    name: 'Alpine Panoramic Vista',
    location: 'Swiss Alps & Zermatt',
    tagline: 'Level-Boarding Mountain Gondolas & Step-Free Glacier Terraces',
    bgImage: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=2000&q=85',
    accentColor: 'from-blue-500/30 to-cyan-600/30',
    borderColor: 'border-blue-400/40',
    tags: ['Swiss Glacier • Step-Free', 'Braille Signage', 'Heated Ramps'],
    marker1: { x: 25, y: 45, label: 'Alpine Express • Level Boarding', icon: '🚠' },
    marker2: { x: 75, y: 35, label: 'Glacier Viewing Deck • Step-Free', icon: '🏔️' },
  },
  {
    id: 'paris',
    name: 'Parisian Sunset & Eiffel',
    location: 'Paris, France',
    tagline: 'Priority Wheelchair Elevators & Paved Riverfront Promenades',
    bgImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2000&q=85',
    accentColor: 'from-purple-500/30 to-pink-600/30',
    borderColor: 'border-purple-400/40',
    tags: ['Eiffel Tower • Priority Lift', 'Zero-Curb Transit', 'Audio Beacons'],
    marker1: { x: 42, y: 30, label: 'North Pillar • Priority Elevator', icon: '🗼' },
    marker2: { x: 80, y: 62, label: 'Seine Promenade • 0-Curb Path', icon: '⛵' },
  },
  {
    id: 'tropical',
    name: 'Tropical Azure Lagoon',
    location: 'Maldives Overwater Boardwalk',
    tagline: 'Floating Wheelchair Beach Ramps & Accessible Overwater Villas',
    bgImage: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=2000&q=85',
    accentColor: 'from-emerald-500/30 to-teal-600/30',
    borderColor: 'border-teal-400/40',
    tags: ['Overwater Boardwalk', 'Beach Wheelchair Ramp', 'Step-Free Jetty'],
    marker1: { x: 20, y: 60, label: 'Boardwalk • Smooth Teak Ramp', icon: '🌴' },
    marker2: { x: 68, y: 45, label: 'Azure Villa • Step-Free Threshold', icon: '🏖️' },
  },
  {
    id: 'kyoto',
    name: 'Kyoto Torii & Bamboo Grove',
    location: 'Kyoto, Japan',
    tagline: 'Continuous Tactile Ground Guides & Multilingual Audio Chimes',
    bgImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2000&q=85',
    accentColor: 'from-rose-500/30 to-red-600/30',
    borderColor: 'border-rose-400/40',
    tags: ['Fushimi Inari • Paved Route', 'Tactile Paving', 'Audio Guide'],
    marker1: { x: 35, y: 48, label: 'Torii Path • Gentle Gradient', icon: '⛩️' },
    marker2: { x: 65, y: 32, label: 'Sacred Shrine • Ramp Access', icon: '🎋' },
  },
];

export const HomePage3D: React.FC<HomePage3DProps> = ({ onEnterWebsite }) => {
  const { user, login, register, accountExists } = useAuth();
  const { setRole, reducedMotion } = useAccessibility();
  const { t } = useLanguage();

  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const currentScene = TRAVEL_SCENES[activeSceneIdx];

  // Preload all background scene images
  useEffect(() => {
    TRAVEL_SCENES.forEach((scene) => {
      const img = new Image();
      img.src = scene.bgImage;
    });
  }, []);

  // Automatically cycle through background scenes every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSceneIdx((prev) => (prev + 1) % TRAVEL_SCENES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeSceneIdx]);

  // Auth Mode: 'LOGIN' or 'REGISTER' (Sign In vs Register - default to REGISTER for compulsory onboarding)
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderOption>('FEMALE');
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [noAccountWarning, setNoAccountWarning] = useState<string | null>(null);
  const [authPasswordError, setAuthPasswordError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  // Selected Accessibility needs for registration
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([
    'Wheelchair (0-Stairs)',
    '1:12 Ramp Slope',
    'Accessible Restroom',
  ]);

  // Validation Logic
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() === '' ? false : emailRegex.test(email.trim());
  const passwordRequirements = evaluatePasswordRequirements(password);
  const isPasswordStrong = passwordRequirements.every((r) => r.met);
  const isNameValid = name.trim().length >= 2;

  const emailError =
    touched.email && email.trim() === ''
      ? 'Email address is required.'
      : touched.email && !isEmailValid
      ? 'Please enter a valid email address (e.g. name@domain.com).'
      : '';

  const passwordError =
    touched.password && password === ''
      ? 'Password is required.'
      : touched.password && authMode === 'REGISTER' && !isPasswordStrong
      ? 'Password does not satisfy all security requirements below.'
      : '';

  const nameError =
    touched.name && name.trim() === ''
      ? 'Full name is required.'
      : touched.name && !isNameValid
      ? 'Please enter at least 2 characters.'
      : '';

  // 3D Cursor Movement State
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });
  const [smoothCursor, setSmoothCursor] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Smooth lerp interpolation for 3D camera effect
  useEffect(() => {
    let animId: number;
    const lerp = () => {
      setSmoothCursor((prev) => ({
        x: prev.x + (cursorOffset.x - prev.x) * 0.08,
        y: prev.y + (cursorOffset.y - prev.y) * 0.08,
      }));
      animId = requestAnimationFrame(lerp);
    };
    animId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animId);
  }, [cursorOffset]);

  // Handle pointer move over container to compute normalized -1 to +1 coordinate space
  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Normalized from -1 to +1
    const normX = (clientX / width - 0.5) * 2;
    const normY = (clientY / height - 0.5) * 2;

    setCursorOffset({ x: normX, y: normY });
    setIsHovering(true);
  };

  const handlePointerLeave = () => {
    setCursorOffset({ x: 0, y: 0 });
    setIsHovering(false);
  };

  // Login handler with verification if account exists
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setNoAccountWarning(null);
    setAuthPasswordError(null);

    if (!isEmailValid || !password) {
      return;
    }

    // Check if account exists
    const exists = accountExists(email.trim());
    if (!exists) {
      setNoAccountWarning(email.trim());
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password, selectedRole);
      setRole(selectedRole);
      setSuccessToast(`Signed in successfully! Welcome to AccessWay.`);
      setTimeout(() => {
        onEnterWebsite();
      }, 700);
    } catch (err: any) {
      if (err?.message?.includes('NO_ACCOUNT_FOUND')) {
        setNoAccountWarning(email.trim());
      } else if (err?.message?.includes('INVALID_PASSWORD')) {
        setAuthPasswordError('Incorrect password. Please enter the password you registered with.');
      } else {
        setAuthPasswordError(err?.message || 'Failed to sign in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setNoAccountWarning(null);
    setAuthPasswordError(null);

    if (!isNameValid || !isEmailValid || !isPasswordStrong) {
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, selectedRole, selectedNeeds, gender);
      setRole(selectedRole);
      setSuccessToast(`Account registered and password saved! Entering AccessWay...`);
      setTimeout(() => {
        onEnterWebsite();
      }, 700);
    } catch (err: any) {
      setAuthPasswordError(err?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail || !emailRegex.test(forgotPasswordEmail)) return;
    setForgotPasswordSent(true);
    setTimeout(() => {
      setForgotPasswordSent(false);
      setShowForgotPasswordModal(false);
      setForgotPasswordEmail('');
      setSuccessToast(`Password reset link sent to ${forgotPasswordEmail}`);
    }, 1800);
  };

  const handleNeedToggle = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  // 3D Matrix Transformations based on cursor position
  const tiltX = smoothCursor.y * -14; // Pitch (up/down tilt)
  const tiltY = smoothCursor.x * 16;  // Yaw (left/right tilt)
  const bgTranslateX = smoothCursor.x * -35;
  const bgTranslateY = smoothCursor.y * -35;
  const bgScale = isHovering ? 1.08 : 1.04;

  const floatingElemX = smoothCursor.x * 45;
  const floatingElemY = smoothCursor.y * 45;

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      className="relative w-full min-h-screen overflow-hidden bg-slate-950 text-white select-none flex flex-col justify-between font-sans"
      style={{ perspective: '1200px' }}
      id="accessway-3d-home"
    >
      {/* ========================================================
          3D CURSOR-MOVING TRAVEL BACKGROUND LAYER
          ======================================================== */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 ease-out origin-center"
        style={{
          transform: `scale(${bgScale}) translate3d(${bgTranslateX}px, ${bgTranslateY}px, 0px) rotateX(${tiltX * 0.4}deg) rotateY(${tiltY * 0.4}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Main Travel Background Images with Smooth 10s Crossfade */}
        {TRAVEL_SCENES.map((scene, idx) => (
          <div
            key={scene.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out filter brightness-90 contrast-105 ${
              activeSceneIdx === idx ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundImage: `url(${scene.bgImage})`,
            }}
          />
        ))}

        {/* Dynamic Multi-Color Lighting Spotlight following the cursor */}
        <div
          className="absolute inset-0 opacity-40 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle 650px at ${(smoothCursor.x + 1) * 50}% ${(smoothCursor.y + 1) * 50}%, rgba(59, 130, 246, 0.45), rgba(99, 102, 241, 0.25), transparent 70%)`,
          }}
        />

        {/* Ambient Dark Gradient Voids for optimal readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />

        {/* 3D Depth Travel Landmarks / Waypoint Pins floating in 3D Space */}
        <div
          className="absolute hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white shadow-2xl transition-transform duration-200"
          style={{
            left: `${currentScene.marker1.x}%`,
            top: `${currentScene.marker1.y}%`,
            transform: `translate3d(${floatingElemX * 0.8}px, ${floatingElemY * 0.8}px, 60px) rotateX(${tiltX * 0.6}deg) rotateY(${tiltY * 0.6}deg)`,
          }}
        >
          <span className="text-base">{currentScene.marker1.icon}</span>
          <div className="text-left">
            <div className="text-[11px] font-black tracking-wide text-white drop-shadow-sm">
              {currentScene.marker1.label}
            </div>
            <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Verified 0-Stairs</span>
            </div>
          </div>
        </div>

        <div
          className="absolute hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white shadow-2xl transition-transform duration-200"
          style={{
            left: `${currentScene.marker2.x}%`,
            top: `${currentScene.marker2.y}%`,
            transform: `translate3d(${floatingElemX * -0.6}px, ${floatingElemY * -0.6}px, 80px) rotateX(${tiltX * 0.7}deg) rotateY(${tiltY * 0.7}deg)`,
          }}
        >
          <span className="text-base">{currentScene.marker2.icon}</span>
          <div className="text-left">
            <div className="text-[11px] font-black tracking-wide text-white drop-shadow-sm">
              {currentScene.marker2.label}
            </div>
            <div className="text-[9px] text-blue-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>ISO-21542 Audited</span>
            </div>
          </div>
        </div>

        {/* Floating 3D Travel Compass / Airplane Token */}
        <div
          className="absolute top-24 right-12 hidden lg:flex items-center gap-3 p-3.5 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl"
          style={{
            transform: `translate3d(${floatingElemX * 1.2}px, ${floatingElemY * 1.2}px, 100px) rotateX(${tiltX * 1.2}deg) rotateY(${tiltY * 1.2}deg)`,
          }}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Plane className="w-5 h-5 text-white transform -rotate-45 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Global Step-Free Routing</div>
            <div className="text-[10px] text-blue-300 font-semibold">15+ World Destinations Active</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          TOP HOME NAVBAR: BRANDING & 3D ENVIRONMENT SELECTOR
          ======================================================== */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-5 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        {/* Logo & Identity - Transparent Background */}
        <div className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
          <AccessWayLogo variant="full" size="md" darkContrast={true} />
        </div>

        {/* 3D World Scene Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15">
          {TRAVEL_SCENES.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => setActiveSceneIdx(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSceneIdx === idx
                  ? 'bg-blue-600 text-white shadow-lg ring-1 ring-white/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{idx === 0 ? '🏛️' : idx === 1 ? '🏔️' : idx === 2 ? '🗼' : idx === 3 ? '🌴' : '⛩️'}</span>
              <span>{scene.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Live Security Badge */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-2xl bg-white/10 border border-white/20 text-white text-[11px] font-bold shadow-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Secure Access</span>
          </div>
        </div>
      </header>

      {/* ========================================================
          CENTER HERO: VALUE HEADLINE & LOW-OPACITY CREDENTIALS FORM
          ======================================================== */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-10">
        
        {/* LEFT COLUMN: HERO VALUE PROP & 3D INTERACTIVITY TELEMETRY */}
        <div
          className="lg:w-1/2 space-y-6 text-left transition-transform duration-200"
          style={{
            transform: `rotateX(${tiltX * 0.3}deg) rotateY(${tiltY * 0.3}deg)`,
          }}
        >
          {/* World Wonder Location Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white text-xs font-bold shadow-xl animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>3D Travel World: {currentScene.location}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-xl">
            Travel the World with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">
              Zero Physical Barriers
            </span>
            .
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-xl drop-shadow-md">
            {currentScene.tagline}. Access verified 1:12 ramp slopes, wheelchair van transfers, tactile paths, roll-in showers and step-free transit in one unified platform.
          </p>

          {/* Interactive Feature Tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {currentScene.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-slate-200 text-xs font-semibold"
              >
                ✓ {tag}
              </span>
            ))}
          </div>

          {/* 3D Motion HUD Indicator */}
          <div className="pt-2 flex items-center gap-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Navigation className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Move your cursor / touch to explore 3D depth</span>
            </div>
            <div className="hidden sm:inline text-[11px] text-slate-500 font-mono">
              Pitch: {tiltX.toFixed(1)}° • Yaw: {tiltY.toFixed(1)}°
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MODERN ACCESSIBLE LOGIN & REGISTRATION INTERFACE */}
        <div
          className="lg:w-1/2 max-w-md w-full transition-transform duration-200"
          style={{
            transform: `rotateX(${tiltX * -0.5}deg) rotateY(${tiltY * -0.5}deg)`,
          }}
        >
          {/* Translucent Glassmorphism Credentials Container */}
          <div className="relative rounded-3xl p-6 sm:p-8 bg-slate-950/40 backdrop-blur-2xl border border-white/20 shadow-2xl text-white space-y-5 ring-1 ring-white/10 hover:border-white/30 transition-colors">
            
            {/* Ambient Inner Color Sheen */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-blue-500/10 pointer-events-none" />

            {/* Success Toast */}
            {successToast && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successToast}</span>
              </div>
            )}

            {/* Header with Mode Switcher (Sign In vs Register) */}
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span>{authMode === 'LOGIN' ? 'Account Sign In' : 'Account Registration'}</span>
                </h2>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {authMode === 'LOGIN'
                    ? 'Enter your email and password to access your account'
                    : 'Create your accessible traveler or auditor credentials'}
                </p>
              </div>

              {/* Mode Switcher Pill with High-Contrast Accessibility */}
              <div className="flex p-1 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setNoAccountWarning(null);
                    setTouched({});
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    authMode === 'LOGIN'
                      ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/30'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  aria-pressed={authMode === 'LOGIN'}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('REGISTER');
                    setNoAccountWarning(null);
                    setTouched({});
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    authMode === 'REGISTER'
                      ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/30'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  aria-pressed={authMode === 'REGISTER'}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Warning Alert Banner when account does not exist */}
            {noAccountWarning && authMode === 'LOGIN' && (
              <div
                role="alert"
                className="relative z-10 p-4 rounded-2xl bg-gradient-to-br from-amber-500/30 via-rose-500/25 to-amber-600/30 border-2 border-amber-400/90 text-white text-xs shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 backdrop-blur-xl ring-1 ring-amber-400/50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg mt-0.5">
                    <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-black text-amber-200 text-xs tracking-tight">
                      No Account Found for "{noAccountWarning}"
                    </p>
                    <p className="text-[11px] text-slate-100 leading-relaxed font-medium">
                      You don't have an account registered with this email yet. You must register first before you can sign in.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <span className="text-[10px] text-amber-200 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Free & instant pass</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('REGISTER');
                      setNoAccountWarning(null);
                      setTouched({});
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs shadow-lg transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register First</span>
                  </button>
                </div>
              </div>
            )}

            {/* Accessible Two-Field Auth Form */}
            <form
              onSubmit={authMode === 'LOGIN' ? handleLogin : handleRegister}
              noValidate
              className="relative z-10 space-y-4"
            >
              {/* Optional Registration: Full Name Field */}
              {authMode === 'REGISTER' && (
                <div>
                  <label
                    htmlFor="home-auth-name"
                    className="block text-xs font-bold text-slate-200 mb-1"
                  >
                    Full Name <span className="text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      id="home-auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                      placeholder="e.g. Alex Rivera"
                      aria-required="true"
                      aria-invalid={!!nameError}
                      aria-describedby={nameError ? 'home-name-error' : undefined}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:bg-white/15 focus:outline-hidden transition-all backdrop-blur-md ${
                        nameError
                          ? 'border-rose-400 focus:ring-rose-400'
                          : 'border-white/20 focus:ring-blue-400'
                      }`}
                    />
                  </div>
                  {nameError && (
                    <p id="home-name-error" className="text-[11px] text-rose-300 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{nameError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Main Field 1: Email Address */}
              <div>
                <label
                  htmlFor="home-auth-email"
                  className="block text-xs font-bold text-slate-200 mb-1"
                >
                  Email <span className="text-rose-400" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    id="home-auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="e.g. name@example.com"
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'home-email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:bg-white/15 focus:outline-hidden transition-all backdrop-blur-md ${
                      emailError
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-white/20 focus:ring-blue-400'
                    }`}
                  />
                </div>
                {emailError && (
                  <p id="home-email-error" className="text-[11px] text-rose-300 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              {/* Main Field 2: Password with Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="home-auth-password"
                    className="block text-xs font-bold text-slate-200"
                  >
                    Password <span className="text-rose-400" aria-hidden="true">*</span>
                  </label>
                  {authMode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-[11px] font-bold text-blue-300 hover:text-blue-200 underline focus:outline-hidden focus:ring-1 focus:ring-blue-400 rounded-sm"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    id="home-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'LOGIN' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authPasswordError) setAuthPasswordError(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    placeholder="Enter your secure password"
                    aria-required="true"
                    aria-invalid={!!passwordError || !!authPasswordError}
                    aria-describedby={passwordError || authPasswordError ? 'home-password-error' : undefined}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/10 border text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:bg-white/15 focus:outline-hidden transition-all backdrop-blur-md ${
                      passwordError || authPasswordError
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-white/20 focus:ring-blue-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white p-1 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-400 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {(passwordError || authPasswordError) && (
                  <p id="home-password-error" className="text-[11px] text-rose-300 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{authPasswordError || passwordError}</span>
                  </p>
                )}
              </div>

              {/* Real-time checklist for password requirements (Registration section ONLY) */}
              {authMode === 'REGISTER' && (
                <div className="pt-1">
                  <PasswordRequirementsChecklist
                    requirements={passwordRequirements}
                    theme="dark"
                  />
                </div>
              )}

              {/* Registration: Gender Field */}
              {authMode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Gender <span className="text-rose-400" aria-hidden="true">*</span>
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
                        className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 backdrop-blur-md ${
                          gender === opt.value
                            ? 'border-blue-400 bg-blue-600/40 text-white ring-1 ring-blue-400 shadow-md'
                            : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
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

              {/* Registration: Accessibility Needs */}
              {authMode === 'REGISTER' && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-200">
                    Accessibility Needs:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      'Wheelchair (0-Stairs)',
                      '1:12 Ramp Slope',
                      'Accessible Restroom',
                      'Audio Guidance',
                    ].map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer text-[11px] font-medium text-slate-200 hover:bg-white/10"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNeeds.includes(item)}
                          onChange={() => handleNeedToggle(item)}
                          className="rounded border-white/30 text-blue-600 focus:ring-blue-500 w-3 h-3"
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 'Remember me' Checkbox & Security Badge */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/30 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px]">Remember me</span>
                </label>
                <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Secure SSL</span>
                </span>
              </div>

              {/* Primary 'Sign In' or 'Register' Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl hover:shadow-2xl transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-400"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : authMode === 'LOGIN' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password Modal / Drawer */}
            {showForgotPasswordModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-white/20 p-6 text-white shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-white">Reset Password</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="text-slate-400 hover:text-white p-1 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter your registered account email. We will send you an ISO-secure password reset link.
                  </p>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotPasswordSent}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {forgotPasswordSent ? 'Sending link...' : 'Send Reset Link'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>

      {/* ========================================================
          BOTTOM SCENE CONTROLS & COMPLIANCE BAR
          ======================================================== */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">Live 3D Travel Engine</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-300">ISO 21542 & WCAG 2.2 AA Accessible</span>
        </div>

        <div className="flex items-center gap-2">
          {TRAVEL_SCENES.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => setActiveSceneIdx(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                activeSceneIdx === idx
                  ? 'bg-blue-400 w-6'
                  : 'bg-white/30 hover:bg-white/60'
              }`}
              title={scene.name}
            />
          ))}
        </div>
      </footer>
    </div>
  );
};
