import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Award,
  BarChart3,
  Leaf,
  Flame,
  X,
  Sparkles,
  LogIn,
  LogOut,
  Bug,
  Cloud,
  PanelLeft,
} from 'lucide-react';
import Analytics01Icon from '@hugeicons/core-free-icons/Analytics01Icon';
import Award01Icon from '@hugeicons/core-free-icons/Award01Icon';
import Bug01Icon from '@hugeicons/core-free-icons/Bug01Icon';
import Camera01Icon from '@hugeicons/core-free-icons/Camera01Icon';
import { ScanPrediction, UserEcoState, WasteCategoryId } from './types/eco';
import { CATEGORY_LIST, WASTE_ITEMS } from './data/wasteDatabase';
import { buildSamplePrediction, loadVisionModel } from './utils/visionClassifier';
import {
  getInitialEcoState,
  recordCorrectDisposal,
  redeemEcoReward,
  saveEcoState,
} from './utils/ecoStorage';
import {
  AuthUser,
  fetchCurrentSession,
  loadRemoteEcoState,
  saveRemoteEcoState,
  signOutSession,
} from './utils/authClient';
import { ScannerStudio } from './components/ScannerStudio';
import { DisposalVerifyModal } from './components/DisposalVerifyModal';
import { RewardsHub } from './components/RewardsHub';
import { ImpactMatrix } from './components/ImpactMatrix';
import { AuthModal } from './components/AuthModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import BranchedMenu, { BranchedMenuGroup } from './components/BranchedMenu';
import AnimatedContent from './components/AnimatedContent';
import SpecularButton from './components/SpecularButton';
import LandingPage from './components/LandingPage';

type TabId = 'scan' | 'rewards' | 'impact';

export function App() {
  const [view, setView] = useState<'landing' | 'studio'>('landing');
  const [activeTab, setActiveTab] = useState<TabId>('scan');
  const [branchActive, setBranchActive] = useState<string>('scan');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [prediction, setPrediction] = useState<ScanPrediction | null>(() =>
    buildSamplePrediction(WASTE_ITEMS[1], 'clean')
  );
  const [ecoState, setEcoState] = useState<UserEcoState>(() => getInitialEcoState());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => {
        void loadVisionModel();
      }, { timeout: 2000 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => {
      void loadVisionModel();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchCurrentSession().then(async (user) => {
      if (!mounted || !user) return;
      setAuthUser(user);
      const remote = await loadRemoteEcoState();
      if (!mounted) return;
      if (remote) {
        setEcoState(remote);
        saveEcoState(remote);
      } else {
        saveRemoteEcoState(ecoState);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    const remote = await loadRemoteEcoState();
    if (remote) {
      const merged =
        remote.lifetimePoints >= ecoState.lifetimePoints ? remote : ecoState;
      setEcoState(merged);
      saveEcoState(merged);
      if (merged === ecoState) {
        await saveRemoteEcoState(ecoState);
      }
    } else {
      await saveRemoteEcoState(ecoState);
    }
  };

  const handleSignOut = async () => {
    await signOutSession();
    setAuthUser(null);
  };

  const handleConfirmDisposal = (_selectedBin: WasteCategoryId) => {
    if (!prediction) {
      return { awardedPoints: 0, newlyUnlockedBadges: [], capped: false };
    }
    const streakBonus = ecoState.streakDays >= 3 ? 5 : 0;
    const res = recordCorrectDisposal(ecoState, {
      itemName: prediction.item.name,
      category: prediction.effectiveCategory,
      binName: prediction.item.name,
      basePoints: prediction.item.basePoints,
      wasteScore: prediction.effectiveScore,
      co2SavedKg: prediction.item.co2SavedKg,
      streakBonus,
    });
    setEcoState(res.nextState);
    if (authUser) {
      saveRemoteEcoState(res.nextState);
    }
    return {
      awardedPoints: res.awardedPoints,
      newlyUnlockedBadges: res.newlyUnlockedBadges,
      capped: res.capped,
    };
  };

  const handleRedeem = (rewardId: string, quantity = 1) => {
    const res = redeemEcoReward(ecoState, rewardId, quantity);
    if (res.ok) {
      setEcoState(res.nextState);
      if (authUser) {
        saveRemoteEcoState(res.nextState);
      }
    }
    return { ok: res.ok, message: res.message };
  };

  const branchedItems: BranchedMenuGroup[] = useMemo(
    () => [
      {
        label: 'EcoPulse Hub',
        children: [
          { value: 'scan', label: 'AI Scanner', icon: Camera01Icon },
          { value: 'rewards', label: 'Rewards & Points', icon: Award01Icon },
          { value: 'impact', label: 'Impact & Matrix', icon: Analytics01Icon },
        ],
      },
      {
        label: '6 Waste Streams',
        children: CATEGORY_LIST.map((c) => ({
          value: `bin:${c.id}`,
          label: c.label,
          dotColor: c.hex,
        })),
      },
      {
        label: 'Tools',
        children: [
          { value: 'diagnostics', label: 'Error Diagnostics', icon: Bug01Icon },
        ],
      },
    ],
    []
  );

  const handleBranchSelect = (value: string) => {
    setBranchActive(value);
    setDrawerOpen(false);
    if (value === 'scan' || value === 'rewards' || value === 'impact') {
      setActiveTab(value);
      return;
    }
    if (value.startsWith('bin:')) {
      setActiveTab('impact');
      return;
    }
    if (value === 'diagnostics') {
      setDiagnosticsOpen(true);
    }
  };

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setBranchActive(tab);
  };

  const navItems: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'scan', label: 'AI Scanner', icon: <Camera className="w-4 h-4" /> },
    { id: 'rewards', label: 'Rewards & Points', icon: <Award className="w-4 h-4" /> },
    { id: 'impact', label: 'Impact & Matrix', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const openStudioFromLanding = (tab: TabId = 'scan', category?: WasteCategoryId) => {
    setActiveTab(tab);
    setBranchActive(category ? `bin:${category}` : tab);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onOpenStudio={openStudioFromLanding}
          onOpenLogin={() => openAuth('signin')}
          onOpenSignUp={() => openAuth('signup')}
          onSignOut={handleSignOut}
          points={ecoState.points}
          isSignedIn={Boolean(authUser)}
          userName={authUser?.name}
        />
        {authOpen && (
          <AuthModal
            initialMode={authMode}
            onClose={() => setAuthOpen(false)}
            onAuthenticated={handleAuthenticated}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-8">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              title="Open Branch Navigation"
              className="xl:hidden p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('landing')}
              title="Back to EcoPulse Home"
              className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                    EcoPulse
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Home
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden lg:block truncate">
                  Smart Waste Classifier · 6-Stream Segregator · EcoPoints
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Points, Auth & Diagnostics */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => switchTab('rewards')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <span>{ecoState.points} pts</span>
              <span className="hidden sm:inline-flex text-amber-600 items-center gap-0.5 pl-1 border-l border-emerald-200">
                <Flame className="w-3.5 h-3.5" />
                {ecoState.streakDays}d
              </span>
            </button>

            {authUser ? (
              <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline font-semibold text-slate-800 max-w-24 truncate">
                  {authUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <SpecularButton
                size="sm"
                radius={18}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#525252"
                surfaceColor="#18181b"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={() => setAuthOpen(true)}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </SpecularButton>
            )}

            <button
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              title="Error Tracking & Diagnostics"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              <Bug className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout with Desktop BranchedMenu Sidebar */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-6 flex gap-6 flex-1 items-start">
        <aside className="hidden xl:block sticky top-22 shrink-0 bg-zinc-950 rounded-3xl p-4 border border-zinc-800 shadow-lg">
          <div className="px-2 pb-3 mb-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Navigation Tree
            </span>
            <span className="text-[10px] text-zinc-400">v2.0 AI</span>
          </div>
          <BranchedMenu
            items={branchedItems}
            defaultOpen={[0, 1]}
            defaultActive="scan"
            activeValue={branchActive}
            onSelect={(value) => handleBranchSelect(value)}
            color="#f5f5f5"
            accentColor="#34d399"
            lineColor="#3f3f46"
            width={240}
            rowHeight={36}
            indent={40}
            trunk={14}
            radius={10}
            lineWidth={1.5}
            fontSize={14}
            drawDuration={400}
            foldDuration={300}
          />
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          {/* Hero Journey Ribbon on Scanner Tab */}
          {activeTab === 'scan' && (
            <AnimatedContent
              distance={60}
              direction="vertical"
              duration={0.75}
              ease="power3.out"
              blur={0}
              stagger={0.08}
              threshold={0.1}
            >
              <section className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-5 sm:p-6 text-white shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Recycling Fails Before the Bin — EcoPulse Makes Every Item Actionable
                    </span>
                    <h1 className="font-display font-extrabold text-xl sm:text-2xl mt-2.5">
                      Scan Waste Live, Check Your 4-Factor Score &amp; Segregate into the Right Bin
                    </h1>
                  </div>
                  <AnimatedContent
                    distance={35}
                    direction="vertical"
                    duration={0.7}
                    ease="power3.out"
                    blur={0}
                    stagger={0.08}
                    threshold={0.1}
                    className="grid grid-cols-4 gap-2 shrink-0"
                  >
                    {[
                      { num: '1', label: 'Snap Item' },
                      { num: '2', label: 'AI Scan' },
                      { num: '3', label: 'Get Score' },
                      { num: '4', label: 'Dispose & Earn' },
                    ].map((step) => (
                      <div
                        key={step.num}
                        className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2 text-center h-full"
                      >
                        <span className="text-[10px] font-bold text-emerald-300">STEP {step.num}</span>
                        <p className="text-[11px] font-semibold text-white mt-0.5">{step.label}</p>
                      </div>
                    ))}
                  </AnimatedContent>
                </div>

                {/* 6 Waste Categories Strip */}
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-300 font-semibold mr-1">
                    6 Segregation Streams:
                  </span>
                  {CATEGORY_LIST.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleBranchSelect(`bin:${cat.id}`)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition cursor-pointer"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.hex }}
                      />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </section>
            </AnimatedContent>
          )}

          {activeTab === 'scan' && (
            <ScannerStudio
              prediction={prediction}
              onPredictionChange={setPrediction}
              onOpenVerifyModal={() => setVerifyOpen(true)}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsHub
              ecoState={ecoState}
              onRedeem={handleRedeem}
              userName={authUser?.name}
            />
          )}

          {activeTab === 'impact' && <ImpactMatrix />}
        </main>
      </div>

      {/* Mobile / Tablet Slide-Over BranchedMenu Drawer */}
      {drawerOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-zinc-950 text-white h-full p-5 border-r border-zinc-800 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                EcoPulse Menu
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <BranchedMenu
              items={branchedItems}
              defaultOpen={[0, 1]}
              defaultActive="scan"
              activeValue={branchActive}
              onSelect={(value) => handleBranchSelect(value)}
              color="#f5f5f5"
              accentColor="#34d399"
              lineColor="#3f3f46"
              width={240}
              rowHeight={36}
              indent={40}
              trunk={14}
              radius={10}
              lineWidth={1.5}
              fontSize={14}
              drawDuration={400}
              foldDuration={300}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-3 h-16">
        {navItems.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
                active ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {tab.icon}
              <span>{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Bin Verification Modal for Points */}
      {verifyOpen && prediction && (
        <DisposalVerifyModal
          prediction={prediction}
          onClose={() => setVerifyOpen(false)}
          onConfirmCorrectBin={handleConfirmDisposal}
        />
      )}

      {/* Sign In / Sign Up Modal */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {/* Error Tracking & Diagnostics Modal */}
      {diagnosticsOpen && (
        <DiagnosticsModal onClose={() => setDiagnosticsOpen(false)} />
      )}
    </div>
  );
}

export default App;
