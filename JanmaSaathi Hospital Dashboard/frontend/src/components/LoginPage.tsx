import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { HOSPITAL_FACILITIES } from '../data/facilities';
import { auth } from '../lib/firebase';

function formatHospitalAuthError(err: unknown): string {
  const code =
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid hospital email address or password. Please verify your credentials and try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid hospital email address.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Unable to connect right now. Please check your internet connection and try again.';
    case 'auth/unauthorized-continue-uri':
    case 'auth/unauthorized-domain':
      return 'This Hospital Dashboard domain is awaiting Firebase Authentication domain authorization. Please contact your system administrator.';
    case 'auth/operation-not-allowed':
      return 'Email/password hospital sign-in is not currently enabled on this Firebase project. Please contact your system administrator.';
    default:
      return 'Unable to sign in right now. Please verify your credentials or contact your hospital administrator.';
  }
}

/**
 * Minimal editorial maternal healthcare line illustration in Cherry (#890149) and Dusty Rose (#D9A2B5).
 */
const MaternalCareIllustration: React.FC = () => (
  <svg
    viewBox="0 0 420 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-[380px] h-auto"
    role="img"
    aria-label="Maternal healthcare line illustration depicting gentle care and connection"
  >
    {/* Subtle botanical stem and heartbeat continuity line */}
    <path
      d="M12 64 C56 64, 72 34, 114 34 C146 34, 158 58, 184 58 L196 58 L205 32 L216 74 L226 48 L236 58 C264 58, 280 34, 322 34 C362 34, 380 56, 408 56"
      stroke="#D9A2B5"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Delicate botanical leaves left */}
    <path
      d="M78 44 C72 28, 84 18, 96 22 C94 34, 86 42, 78 44 Z"
      fill="#D9A2B5"
      fillOpacity="0.28"
      stroke="#890149"
      strokeWidth="1.2"
    />
    <path
      d="M114 34 C122 18, 138 18, 144 28 C134 36, 122 38, 114 34 Z"
      fill="#890149"
      fillOpacity="0.12"
      stroke="#890149"
      strokeWidth="1.2"
    />
    {/* Central caring hands / heart lotus motif */}
    <path
      d="M210 18 C201 8, 184 12, 184 24 C184 36, 200 44, 210 52 C220 44, 236 36, 236 24 C236 12, 219 8, 210 18 Z"
      fill="#890149"
      fillOpacity="0.10"
      stroke="#890149"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M174 70 C186 78, 198 81, 210 81 C222 81, 234 78, 246 70"
      stroke="#890149"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    {/* Delicate botanical leaves right */}
    <path
      d="M306 36 C300 20, 314 14, 326 20 C322 32, 314 36, 306 36 Z"
      fill="#D9A2B5"
      fillOpacity="0.32"
      stroke="#890149"
      strokeWidth="1.2"
    />
    <path
      d="M342 40 C352 26, 366 28, 370 38 C360 44, 350 44, 342 40 Z"
      fill="#890149"
      fillOpacity="0.10"
      stroke="#890149"
      strokeWidth="1.2"
    />
    {/* Subtle warm dots along care horizon */}
    <circle cx="48" cy="56" r="2.2" fill="#D9A2B5" />
    <circle cx="154" cy="46" r="2" fill="#890149" fillOpacity="0.45" />
    <circle cx="272" cy="46" r="2" fill="#890149" fillOpacity="0.45" />
    <circle cx="384" cy="52" r="2.2" fill="#D9A2B5" />
  </svg>
);

/**
 * Warm editorial portrait artwork of a mother lovingly holding her child,
 * composed in the exact JanmaSaathi Alabaster, Dusty Rose, Cherry, and Warm Ink palette.
 */
const MotherAndChildPortrait: React.FC = () => (
  <div className="w-full overflow-hidden rounded-lg border border-[#DDD8CB] bg-[#EAE6D8]">
    <svg
      viewBox="0 0 640 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block"
      role="img"
      aria-label="Mother lovingly holding her newborn child in soft morning light"
    >
      <defs>
        <linearGradient id="morningGlow" x1="0" y1="0" x2="640" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8F5EC" />
          <stop offset="55%" stopColor="#EFE6DF" />
          <stop offset="100%" stopColor="#E6D2D8" />
        </linearGradient>
        <radialGradient id="sunHalo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(215 112) rotate(30) scale(210 155)">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
          <stop offset="60%" stopColor="#F7EDF2" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D9A2B5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sareeDrape" x1="160" y1="120" x2="430" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9C1458" />
          <stop offset="55%" stopColor="#890149" />
          <stop offset="100%" stopColor="#620234" />
        </linearGradient>
        <linearGradient id="babyWrap" x1="255" y1="150" x2="420" y2="245" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBF9F2" />
          <stop offset="100%" stopColor="#EADCE2" />
        </linearGradient>
      </defs>

      {/* Soft sunlit room backdrop */}
      <rect width="640" height="280" fill="url(#morningGlow)" />
      <rect width="640" height="280" fill="url(#sunHalo)" />

      {/* Architectural sunlit window arch in background */}
      <path
        d="M58 280 V106 C58 52, 102 18, 156 18 C210 18, 254 52, 254 106 V280"
        fill="#FBFBF7"
        fillOpacity="0.52"
      />
      <path
        d="M84 280 V112 C84 70, 116 42, 156 42 C196 42, 228 70, 228 112 V280"
        stroke="#D9A2B5"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />

      {/* Quiet botanical silhouettes on right */}
      <path
        d="M524 280 C528 210, 548 150, 588 94"
        stroke="#C598A8"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M556 154 C534 140, 526 118, 540 108 C554 118, 560 136, 556 154 Z"
        fill="#D9A2B5"
        fillOpacity="0.34"
      />
      <path
        d="M542 198 C564 180, 588 182, 594 198 C576 210, 556 210, 542 198 Z"
        fill="#D9A2B5"
        fillOpacity="0.28"
      />
      <path
        d="M572 126 C590 112, 610 116, 614 130 C598 138, 582 136, 572 126 Z"
        fill="#890149"
        fillOpacity="0.14"
      />

      {/* Mother silhouette & warm portrait */}
      {/* Hair bun & graceful head profile */}
      <circle cx="204" cy="96" r="24" fill="#30232A" />
      <ellipse cx="244" cy="92" rx="34" ry="38" fill="#30232A" />
      {/* Warm face turning tenderly downward toward her baby */}
      <path
        d="M236 62 C264 62, 282 82, 281 108 C280 126, 268 138, 250 139 C232 140, 220 124, 222 102 C223 80, 226 62, 236 62 Z"
        fill="#D7A78B"
      />
      {/* Gentle brow, closed peaceful smile, and forehead bindi */}
      <circle cx="268" cy="90" r="2.3" fill="#890149" />
      <path
        d="M256 101 C261 104, 267 104, 272 101"
        stroke="#30232A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M258 119 C263 123, 270 122, 274 118"
        stroke="#6B3736"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Hair sweep framing cheek */}
      <path
        d="M220 74 C236 62, 260 62, 276 74 C264 70, 246 76, 236 96 C230 110, 226 126, 214 134 C208 114, 210 86, 220 74 Z"
        fill="#30232A"
      />

      {/* Neck & shoulders */}
      <path d="M230 132 L256 134 L264 166 L218 164 Z" fill="#CFA084" />

      {/* Mother's Cherry saree & gentle cradling torso */}
      <path
        d="M150 280 C156 206, 186 154, 236 148 C276 144, 314 158, 356 184 C394 208, 422 242, 434 280 Z"
        fill="url(#sareeDrape)"
      />
      {/* Dusty rose pallu border across shoulder */}
      <path
        d="M188 280 C206 218, 228 172, 256 150 C268 150, 280 154, 290 160 C260 186, 240 228, 228 280 Z"
        fill="#D9A2B5"
        fillOpacity="0.28"
      />
      <path
        d="M254 150 C226 176, 206 220, 192 280"
        stroke="#F3F3E7"
        strokeOpacity="0.38"
        strokeWidth="1.5"
      />

      {/* Newborn child cradled securely in soft alabaster swaddle */}
      <path
        d="M266 186 C284 158, 326 150, 366 164 C402 176, 426 204, 418 232 C410 258, 366 266, 318 256 C276 248, 252 214, 266 186 Z"
        fill="url(#babyWrap)"
        stroke="#D9A2B5"
        strokeWidth="1.5"
      />
      {/* Baby's peaceful head resting close to mother's heart */}
      <circle cx="316" cy="178" r="24" fill="#DFB49A" />
      {/* Soft baby hair tuft */}
      <path
        d="M294 174 C296 158, 314 150, 330 158 C320 159, 308 164, 298 176 Z"
        fill="#3B2B33"
      />
      {/* Peaceful sleeping eyes and tiny serene expression */}
      <path
        d="M308 179 C311 182, 315 182, 318 179"
        stroke="#30232A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M323 181 C326 184, 330 184, 333 181"
        stroke="#30232A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M317 190 C320 192, 323 192, 325 190"
        stroke="#7E4846"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Mother's protective cradling arm & warm hand supporting baby */}
      <path
        d="M198 194 C218 228, 260 254, 318 258 C354 260, 384 252, 404 236 C398 224, 382 222, 364 228 C334 238, 290 236, 256 216 C238 205, 224 190, 214 176 Z"
        fill="#D4A286"
      />
      {/* Mother's gentle hand resting over the swaddle */}
      <path
        d="M342 222 C354 214, 372 214, 382 220 C386 223, 384 230, 376 232 L346 236 C338 236, 336 227, 342 222 Z"
        fill="#D7A78B"
      />
      {/* Delicate subtle bangle */}
      <path
        d="M332 225 C336 234, 338 242, 336 250"
        stroke="#F3F3E7"
        strokeOpacity="0.8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M327 226 C331 235, 333 243, 331 251"
        stroke="#D9A2B5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Swaddle gentle folds */}
      <path
        d="M286 212 C314 202, 350 202, 388 214"
        stroke="#D9A2B5"
        strokeOpacity="0.7"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M300 228 C330 220, 364 222, 396 230"
        stroke="#D9A2B5"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const LoginPage: React.FC = () => {
  const { enterDemoPersona, signInWithEmail } = useDashboard();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resetNotice, setResetNotice] = useState<string>('');

  const handleHospitalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetNotice('');

    if (!email.trim() || !password) {
      setError('Please enter both your hospital email address and password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await signInWithEmail(email, password, HOSPITAL_FACILITIES[0].id);
    } catch (err) {
      setError(formatHospitalAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetNotice('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your hospital email address above to receive a password reset link.');
      return;
    }

    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetNotice(
        'If an authorized hospital account exists for this email address, a password reset link has been sent.'
      );
    } catch (err) {
      setError(formatHospitalAuthError(err));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleHospitalDemoAccess = () => {
    setError('');
    setResetNotice('');
    enterDemoPersona('hospital-demo', HOSPITAL_FACILITIES[0].id);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F3F3E7] text-[#30232A]">
      {/* LEFT PANEL (~52% desktop) — Brand Story, Quote, Illustration, Tagline & Mother with Child */}
      <section
        aria-label="JanmaSaathi Maternal Care"
        className="w-full lg:w-[52%] bg-[#F3F3E7] px-7 sm:px-12 lg:px-14 xl:px-16 py-9 lg:py-11 flex flex-col justify-between gap-7"
      >
        {/* Top Branding */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/JanmaSaathi_593643c1.png"
            alt="JanmaSaathi logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 object-contain shrink-0"
          />
          <span className="font-serif text-2xl tracking-[-0.01em] text-[#890149] whitespace-nowrap">
            JanmaSaathi
          </span>
        </div>

        {/* Center Editorial Quote, Supporting Line & Maternal Care Illustration */}
        <div className="my-auto py-2 space-y-6 max-w-xl">
          <div className="space-y-3.5">
            <h1 className="font-serif text-[30px] sm:text-[36px] lg:text-[40px] leading-[1.15] tracking-[-0.01em] text-[#30232A]">
              Every mother deserves care. Every new life deserves a healthy beginning.
            </h1>
            <p className="text-[15px] sm:text-base leading-relaxed text-[#665860]">
              A connected journey towards safer motherhood.
            </p>
          </div>

          <div className="pt-1">
            <MaternalCareIllustration />
          </div>
        </div>

        {/* Bottom Tagline & Mother Holding Her Child Image */}
        <div className="space-y-4 max-w-xl">
          <p className="font-serif text-base sm:text-[17px] tracking-[0.01em] text-[#890149]">
            Compassion. Care. Connection.
          </p>
          <MotherAndChildPortrait />
        </div>
      </section>

      {/* RIGHT PANEL (~48% desktop) — Exclusively Hospital Personnel Login */}
      <section
        aria-label="Hospital Login"
        className="w-full lg:w-[48%] bg-white lg:border-l border-t lg:border-t-0 border-[#DDD8CB] px-7 sm:px-12 lg:px-14 xl:px-16 py-10 lg:py-12 flex flex-col justify-between"
      >
        <div className="hidden lg:block h-4" aria-hidden="true" />

        <div className="w-full max-w-[416px] mx-auto my-auto">
          {/* Welcome Heading */}
          <div>
            <h2 className="font-serif text-[32px] sm:text-[36px] leading-[1.14] tracking-[-0.01em] text-[#30232A]">
              Welcome Back
            </h2>
            <p className="mt-2 text-[15px] text-[#665860] leading-relaxed">
              Sign in to your Hospital Dashboard.
            </p>
          </div>

          {/* Hospital Login Form */}
          <form onSubmit={handleHospitalSignIn} className="mt-8 space-y-5" noValidate>
            <div className="pb-2 border-b border-[#EAE5D9]">
              <h3 className="font-serif text-xl text-[#30232A]">Hospital Login</h3>
            </div>

            <div>
              <label
                htmlFor="hospital-email"
                className="block text-sm font-medium text-[#30232A] mb-1.5"
              >
                Hospital Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[#665860] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="hospital-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter hospital email address"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] placeholder:text-[#8E8188] focus:outline-none focus:border-[#890149] focus:ring-2 focus:ring-[#890149]/15 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="hospital-password"
                  className="block text-sm font-medium text-[#30232A]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resettingPassword}
                  className="text-xs font-medium text-[#890149] hover:text-[#6E013A] hover:underline focus-visible:outline-none focus-visible:underline disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {resettingPassword ? 'Sending link...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-[#665860] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="hospital-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter password"
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] placeholder:text-[#8E8188] focus:outline-none focus:border-[#890149] focus:ring-2 focus:ring-[#890149]/15 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#665860] hover:text-[#30232A] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#890149]/30 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-xs text-[#B91C1C] leading-relaxed"
              >
                {error}
              </div>
            )}

            {resetNotice && (
              <div
                role="status"
                className="px-3.5 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md text-xs text-[#15803D] leading-relaxed"
              >
                {resetNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-[#890149] hover:bg-[#6E013A] disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In to Hospital Dashboard'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </form>

          {/* Single Hospital Demo Access Option */}
          <div className="mt-8 pt-6 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={handleHospitalDemoAccess}
              className="group w-full text-left px-4 py-3.5 rounded-md border border-[#DDD8CB] bg-[#FBFBF7] hover:border-[#890149] hover:bg-[#F7EDF2]/40 transition-colors flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#30232A] group-hover:text-[#890149] transition-colors">
                  Hospital Demo Access
                </p>
                <p className="mt-0.5 text-xs text-[#665860]">
                  Preview the Hospital Dashboard with sample maternal care records.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#890149] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Quiet Footer */}
        <footer className="mt-10 pt-4 text-center">
          <p className="text-xs text-[#665860]">Authorized hospital personnel only.</p>
        </footer>
      </section>
    </div>
  );
};
