import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Camera,
  ChevronDown,
  Cpu,
  Layers,
  Leaf,
  LogIn,
  LogOut,
  Recycle,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { WasteCategoryId } from '../types/eco';
import { CATEGORY_LIST } from '../data/wasteDatabase';
import SpecularButton from './SpecularButton';
import AnimatedContent from './AnimatedContent';

export type StudioTab = 'scan' | 'rewards' | 'impact';

interface LandingPageProps {
  onOpenStudio: (tab?: StudioTab, category?: WasteCategoryId) => void;
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => void;
  points: number;
  isSignedIn: boolean;
  userName?: string;
}

const HOW_IT_WORKS_SLIDES = [
  {
    stepNum: 1,
    stepTitle: 'Scan Any Item',
    badge: 'CAMERA',
    cards: [
      { title: 'Plastic Bottle', tag: 'Recyclable', hex: '#2563EB' },
      { title: 'Organic Peel', tag: 'Biodegradable', hex: '#16A34A' },
      { title: 'Power Cell', tag: 'Hazardous', hex: '#DC2626' },
    ],
  },
  {
    stepNum: 2,
    stepTitle: 'See Its Stream',
    badge: 'SORTING',
    cards: [
      { title: 'Green Compost', tag: 'Organics', hex: '#16A34A' },
      { title: 'Blue Recycling', tag: 'Plastics & Paper', hex: '#2563EB' },
      { title: 'Purple Kiosk', tag: 'E-Waste', hex: '#7C3AED' },
    ],
  },
  {
    stepNum: 3,
    stepTitle: 'Check Impact Score',
    badge: 'IMPACT',
    cards: [
      { title: '4-Factor Score', tag: 'Circularity', hex: '#2563EB' },
      { title: 'Contamination Check', tag: 'Condition', hex: '#7C3AED' },
      { title: 'Prep Guidelines', tag: 'Before Toss', hex: '#DC2626' },
    ],
  },
  {
    stepNum: 4,
    stepTitle: 'Confirm & Earn',
    badge: 'REWARDS',
    cards: [
      { title: 'Verified Drop', tag: 'EcoPoints', hex: '#16A34A' },
      { title: 'Daily Streak', tag: 'Active', hex: '#D96A45' },
      { title: 'Green Perks', tag: 'Redeem', hex: '#0D9488' },
    ],
  },
];

const ARC_NODES = [
  { label: 'Biodegradable', bg: '#16A34A', icon: Leaf, size: 58, x: -340, y: 120 },
  { label: 'Recyclable', bg: '#2563EB', icon: Recycle, size: 64, x: -275, y: 38 },
  { label: 'Non-Biodegradable', bg: '#0D9488', icon: Layers, size: 60, x: -190, y: -22 },
  { label: 'E-Waste', bg: '#7C3AED', icon: Cpu, size: 68, x: -95, y: -58 },
  { label: 'Scanner', bg: '#0d0d0d', icon: Camera, size: 72, x: 0, y: -72 },
  { label: 'Impact', bg: '#1D4ED8', icon: BarChart3, size: 68, x: 95, y: -58 },
  { label: 'Hazardous', bg: '#DC2626', icon: ShieldAlert, size: 60, x: 190, y: -22 },
  { label: 'Non-Recyclable', bg: '#475569', icon: Trash2, size: 64, x: 275, y: 38 },
  { label: 'Rewards', bg: '#D96A45', icon: Award, size: 58, x: 340, y: 120 },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenStudio,
  onOpenLogin,
  onOpenSignUp,
  onSignOut,
  points,
  isSignedIn,
  userName,
}) => {
  const [streamsOpen, setStreamsOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const activeSlide = HOW_IT_WORKS_SLIDES[slideIdx];

  const prevSlide = () =>
    setSlideIdx((i) => (i - 1 + HOW_IT_WORKS_SLIDES.length) % HOW_IT_WORKS_SLIDES.length);
  const nextSlide = () =>
    setSlideIdx((i) => (i + 1) % HOW_IT_WORKS_SLIDES.length);

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#0d0d0d] overflow-x-hidden">
      {/* 1. Floating Nav + 2. Hero */}
      <section
        className="relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(64, 118, 198, 0.45) 0%, rgba(111, 159, 224, 0.25) 55%, rgba(207, 226, 247, 0.35) 100%), url('/images/sky-clouds.jpg')`,
          backgroundColor: '#6f9fe0',
        }}
      >
        {/* Floating Pill Navbar */}
        <header className="relative z-30 pt-4 sm:pt-5 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer text-left shrink-0"
            >
              <span className="w-8 h-8 rounded-full bg-white text-[#0d0d0d] flex items-center justify-center shadow-xs">
                <Leaf className="w-4 h-4 text-emerald-600" />
              </span>
              <span className="font-semibold text-sm text-white tracking-tight">
                EcoPulse
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-white/95 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStreamsOpen((o) => !o)}
                  className="inline-flex items-center gap-1 hover:text-white transition cursor-pointer"
                >
                  <span>Streams</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-85" />
                </button>
                {streamsOpen && (
                  <div
                    onMouseLeave={() => setStreamsOpen(false)}
                    className="absolute left-0 top-9 w-56 rounded-2xl bg-white text-[#0d0d0d] shadow-xl border border-[#ececea] p-2 z-50"
                  >
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setStreamsOpen(false);
                          onOpenStudio('impact', cat.id);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f5f5f2] text-left text-xs font-medium cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.hex }}
                        />
                        <span className="flex-1">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a href="#how-it-works" className="hover:text-white transition">
                Steps
              </a>
              <a href="#features" className="hover:text-white transition">
                Features
              </a>
            </nav>

            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium border border-white/25">
                    <span className="max-w-24 truncate">{userName || 'Account'}</span>
                    <span className="opacity-70">·</span>
                    <span>{points} pts</span>
                  </span>
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Sign Out"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/25 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/25 transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSignUp}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#0d0d0d] hover:bg-white/90 text-xs font-semibold transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </button>
                </>
              )}

              <SpecularButton
                size="sm"
                radius={999}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#262626"
                surfaceColor="#0d0d0d"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={() => onOpenStudio('scan')}
              >
                Open Scanner
              </SpecularButton>
            </div>
          </div>
        </header>

        {/* Centered Minimal Hero Stack */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <AnimatedContent
            distance={36}
            direction="vertical"
            duration={0.75}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <h1
              className="font-editorial text-white mx-auto"
              style={{ fontSize: 'clamp(58px, 9.5vw, 116px)', lineHeight: 0.95 }}
            >
              EcoPulse
            </h1>
            <p className="mt-4 max-w-md mx-auto text-[15px] sm:text-base text-white/90 leading-[1.6] font-normal">
              Scan waste, sort into the right bin, earn rewards.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <SpecularButton
                size="lg"
                radius={999}
                tint="#ffffff"
                tintOpacity={0.05}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#262626"
                surfaceColor="#0d0d0d"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={() => onOpenStudio('scan')}
              >
                <ArrowRight className="w-4 h-4" />
                Start Scanning
              </SpecularButton>

              {!isSignedIn && (
                <>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-white/90 text-[#0d0d0d] font-semibold text-sm transition shadow-sm cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSignUp}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-sm border border-white/35 backdrop-blur-sm transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </AnimatedContent>
        </div>

        {/* Two Minimal Tilted Phone Mockups */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-4 flex items-end justify-center gap-4 sm:gap-7 h-[250px] sm:h-[310px] overflow-hidden">
          <div
            className="w-[220px] sm:w-[270px] bg-white rounded-t-[38px] p-2.5 pb-0 shadow-2xl border-[5px] border-[#1c1c1e] -rotate-6 translate-y-6 animate-gentle-drift"
            onClick={() => onOpenStudio('scan')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenStudio('scan')}
          >
            <div className="bg-[#f8fafc] rounded-t-[28px] p-4 space-y-3 cursor-pointer">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                <span>EcoPulse</span>
                <span className="w-16 h-4 rounded-full bg-[#1c1c1e]" />
                <span>AI</span>
              </div>
              <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Plastic Bottle</p>
                    <p className="text-[11px] text-slate-300">Recyclable</p>
                  </div>
                  <span className="text-2xl">🧴</span>
                </div>
                <div className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-center">
                  Blue Recycling Bin
                </div>
              </div>
            </div>
          </div>

          <div
            className="w-[220px] sm:w-[270px] bg-white rounded-t-[38px] p-2.5 pb-0 shadow-2xl border-[5px] border-[#1c1c1e] rotate-6 translate-y-8 animate-gentle-drift"
            style={{ animationDelay: '1.2s' }}
            onClick={() => onOpenStudio('impact')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenStudio('impact')}
          >
            <div className="bg-[#f8fafc] rounded-t-[28px] p-4 space-y-3 cursor-pointer">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                <span>EcoPulse</span>
                <span className="w-16 h-4 rounded-full bg-[#1c1c1e]" />
                <span>Score</span>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">4-Factor Score</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">92 / 100 circularity</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs font-bold text-slate-900">EcoPoints Ready</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Minimal 4-Step Carousel */}
      <section id="how-it-works" className="py-20 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdeade] text-[#d96a45] text-[11px] font-bold uppercase tracking-[0.08em]">
              <Sparkles className="w-3 h-3" />
              ECOPULSE
            </span>
            <h2
              className="font-editorial text-[#0d0d0d]"
              style={{ fontSize: 'clamp(34px, 4.3vw, 52px)' }}
            >
              Scan.
              <br />
              Locate.
              <br />
              Dispose.
            </h2>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous step"
                className="w-9 h-9 rounded-full bg-white border border-[#ececea] hover:bg-[#0d0d0d] hover:text-white text-[#0d0d0d] flex items-center justify-center transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next step"
                className="w-9 h-9 rounded-full bg-white border border-[#ececea] hover:bg-[#0d0d0d] hover:text-white text-[#0d0d0d] flex items-center justify-center transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {HOW_IT_WORKS_SLIDES.map((s, idx) => (
                <button
                  key={s.stepNum}
                  type="button"
                  aria-label={`Step ${s.stepNum}`}
                  onClick={() => setSlideIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === slideIdx ? 'w-5 bg-[#0d0d0d]' : 'w-1.5 bg-[#d4d4d0]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              className="rounded-[24px] p-5 sm:p-8 shadow-sm transition-all duration-300"
              style={{
                background:
                  'linear-gradient(135deg, #f3a683 0%, #e8cbb8 38%, #9cb8e3 72%, #3e69b8 100%)',
              }}
            >
              <div className="rounded-[20px] bg-white/88 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#0d0d0d] text-white text-xs font-bold flex items-center justify-center">
                      {activeSlide.stepNum}
                    </span>
                    <h3 className="font-semibold text-sm sm:text-base text-[#0d0d0d]">
                      {activeSlide.stepTitle}
                    </h3>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#fdeade] text-[#d96a45]">
                    {activeSlide.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {activeSlide.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl bg-white border border-[#ececea] p-4 space-y-2"
                    >
                      <span
                        className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: card.hex }}
                      >
                        {card.tag}
                      </span>
                      <p className="text-xs font-semibold text-[#0d0d0d]">{card.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Floating Waste Streams Arc */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="relative pt-12 sm:pt-36 pb-4">
          <div className="hidden lg:block relative h-20 max-w-3xl mx-auto">
            {ARC_NODES.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.label}
                  title={node.label}
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-[#ececea] shadow-[0_10px_28px_rgba(13,13,13,0.08)] flex items-center justify-center transition-transform duration-300 hover:scale-110"
                  style={{
                    width: `${node.size}px`,
                    height: `${node.size}px`,
                    marginLeft: `${node.x}px`,
                    marginTop: `${node.y}px`,
                  }}
                >
                  <span
                    className="w-[74%] h-[74%] rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: node.bg }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex lg:hidden flex-wrap justify-center gap-2.5 mb-8">
            {ARC_NODES.map((node) => {
              const Icon = node.icon;
              return (
                <span
                  key={node.label}
                  title={node.label}
                  className="w-11 h-11 rounded-full bg-white border border-[#ececea] shadow-xs flex items-center justify-center"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: node.bg }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                </span>
              );
            })}
          </div>

          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={0.75}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="text-center max-w-md mx-auto relative z-10"
          >
            <h2
              className="font-editorial text-[#0d0d0d]"
              style={{ fontSize: 'clamp(34px, 4.5vw, 52px)' }}
            >
              Every Waste Stream
            </h2>
            <div className="mt-6 flex justify-center">
              <SpecularButton
                size="lg"
                radius={999}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#262626"
                surfaceColor="#0d0d0d"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={() => onOpenStudio('scan')}
              >
                Open Scanner
              </SpecularButton>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 5. Clean Minimal Feature Cards */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
        <AnimatedContent
          distance={50}
          direction="vertical"
          duration={0.75}
          ease="power3.out"
          blur={0}
          stagger={0.08}
          threshold={0.1}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <button
            type="button"
            onClick={() => onOpenStudio('scan')}
            className="text-left rounded-[24px] bg-[#fbeee6] border border-[#f3dfd2] p-6 space-y-3 hover:brightness-[0.98] transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#d96a45] bg-white/80 px-2.5 py-1 rounded-full">
              <Camera className="w-3 h-3" />
              SCAN
            </span>
            <h3 className="font-editorial text-2xl text-[#0d0d0d]">Live Camera</h3>
            <p className="text-xs text-[#6b6b6b]">Point at any item for instant sorting.</p>
          </button>

          <button
            type="button"
            onClick={() => onOpenStudio('impact')}
            className="text-left rounded-[24px] bg-white border border-[#ececea] p-6 space-y-3 hover:border-[#d4d4d0] transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b6b6b] bg-[#f5f5f2] px-2.5 py-1 rounded-full">
              <BarChart3 className="w-3 h-3 text-blue-600" />
              IMPACT
            </span>
            <h3 className="font-editorial text-2xl text-[#0d0d0d]">4-Factor Score</h3>
            <p className="text-xs text-[#6b6b6b]">Recyclability, safety &amp; CO₂ impact matrix.</p>
          </button>

          <button
            type="button"
            onClick={() => onOpenStudio('rewards')}
            className="text-left rounded-[24px] bg-[#0d0d0d] text-white p-6 space-y-3 hover:bg-zinc-900 transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
              <Award className="w-3 h-3 text-emerald-400" />
              REWARDS
            </span>
            <h3 className="font-editorial text-2xl text-white">EcoPoints</h3>
            <p className="text-xs text-white/70">Earn points and redeem green perks.</p>
          </button>
        </AnimatedContent>
      </section>

      {/* 6. CTA Band */}
      <section className="px-4 sm:px-8 max-w-6xl mx-auto py-8">
        <div
          className="rounded-[28px] overflow-hidden bg-cover bg-center px-6 py-16 sm:py-20 text-center shadow-sm"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(72, 126, 204, 0.42) 0%, rgba(111, 159, 224, 0.25) 60%, rgba(207, 226, 247, 0.38) 100%), url('/images/sky-clouds.jpg')`,
            backgroundColor: '#6f9fe0',
          }}
        >
          <h2
            className="font-editorial text-white max-w-xl mx-auto"
            style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}
          >
            EcoPulse
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <SpecularButton
              size="lg"
              radius={999}
              tint="#ffffff"
              tintOpacity={0.05}
              textColor="#f5f5f5"
              lineColor="#ffffff"
              baseColor="#262626"
              surfaceColor="#0d0d0d"
              intensity={1}
              idleIntensity={0.35}
              shineSize={10}
              shineFade={34}
              thickness={1.2}
              glow={1}
              followMouse
              proximity={250}
              onClick={() => onOpenStudio('scan')}
            >
              <ArrowRight className="w-4 h-4" />
              Open Scanner
            </SpecularButton>

            {!isSignedIn && (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-6 py-3 rounded-full bg-white hover:bg-white/90 text-[#0d0d0d] font-semibold text-sm transition cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={onOpenSignUp}
                  className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-sm border border-white/35 backdrop-blur-sm transition cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 7. Clean Footer with Giant Cropped Wordmark */}
      <footer className="pt-12 px-4 sm:px-8 max-w-6xl mx-auto overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-10 border-b border-[#ececea]">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span className="font-semibold text-sm text-[#0d0d0d]">EcoPulse</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#6b6b6b]">
            <button
              type="button"
              onClick={() => onOpenStudio('scan')}
              className="hover:text-[#0d0d0d] cursor-pointer"
            >
              Scanner
            </button>
            <button
              type="button"
              onClick={() => onOpenStudio('impact')}
              className="hover:text-[#0d0d0d] cursor-pointer"
            >
              Impact
            </button>
            <button
              type="button"
              onClick={() => onOpenStudio('rewards')}
              className="hover:text-[#0d0d0d] cursor-pointer"
            >
              Rewards
            </button>
            {!isSignedIn && (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="hover:text-[#0d0d0d] cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={onOpenSignUp}
                  className="hover:text-[#0d0d0d] cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="select-none pointer-events-none pt-4 -mb-[6vw] text-center overflow-hidden">
          <span
            className="font-editorial block leading-[0.82] tracking-[-0.03em]"
            style={{
              fontSize: 'clamp(88px, 24vw, 340px)',
              background: 'linear-gradient(180deg, #0d0d0d 0%, #737373 68%, #e5e5e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            EcoPulse
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
