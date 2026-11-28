import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, Cloud } from 'lucide-react';
import { AuthUser, signInWithEmail, signUpWithEmail } from '../utils/authClient';
import LatticeLoader from './LatticeLoader';
import SpecularButton from './SpecularButton';

interface AuthModalProps {
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'signin',
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res =
        mode === 'signup'
          ? await signUpWithEmail({
              name: name.trim() || email.split('@')[0] || 'EcoPulse Explorer',
              email: email.trim(),
              password,
            })
          : await signInWithEmail({
              email: email.trim(),
              password,
            });

      if (!res.ok) {
        setMessage(res.error || 'Authentication failed. Please try again.');
        return;
      }

      if (res.user) {
        onAuthenticated(res.user);
        onClose();
      } else {
        setMessage('Signed in, but could not load profile session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                {mode === 'signin' ? 'Sign In to EcoPulse' : 'Create EcoPulse Account'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Sync EcoPoints, streaks &amp; disposal logs across devices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setMessage(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setMessage(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {message && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              {message}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Divypratap Singh"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password (min 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <SpecularButton
            type="submit"
            size="lg"
            radius={18}
            tint="#ffffff"
            tintOpacity={0.06}
            textColor="#f5f5f5"
            lineColor="#ffffff"
            baseColor="#525252"
            surfaceColor="#059669"
            intensity={1}
            idleIntensity={0.35}
            shineSize={10}
            shineFade={34}
            thickness={1.2}
            glow={1}
            followMouse
            proximity={250}
            fullWidth
            disabled={loading}
          >
            {loading ? (
              <LatticeLoader
                status="working"
                label="Connecting"
                doneLabel="Done in"
                errorLabel="Failed after"
                pattern="orbit"
                grid={3}
                shape="round"
                color="#ffffff"
                doneColor="#22c55e"
                errorColor="#ef4444"
                cellSize={5}
                gap={2}
                fontSize={14}
                step={90}
                idleOpacity={0.2}
                glow={false}
                glowColor=""
                showTimer
              />
            ) : (
              <>
                {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {mode === 'signin' ? 'Sign In & Sync Points' : 'Sign Up & Sync Points'}
              </>
            )}
          </SpecularButton>
        </form>
      </div>
    </div>
  );
};
