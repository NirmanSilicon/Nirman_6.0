import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { UserRole } from '../../types';
import { AuthPage } from './AuthPage';
import {
  X,
  User,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles,
  LogOut,
  Download,
  Award,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Camera,
  Upload,
  Image as ImageIcon,
  Edit3,
  Check,
  Trash2,
  Save,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTrips?: () => void;
  onSignOut?: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'preset-alex',
    name: 'Alex (Wheelchair Explorer)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-rajesh',
    name: 'Dr. Rajesh (Certified Auditor)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-elena',
    name: 'Elena (Transit Lead)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-maya',
    name: 'Maya (Audio & Tactile Guide)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-david',
    name: 'David (Senior Traveler)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-priya',
    name: 'Priya (Accessible Heritage Host)',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-marcus',
    name: 'Marcus (Braille Specialist)',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'preset-jordan',
    name: 'Jordan (Adaptive Traveler)',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTrips,
  onSignOut,
}) => {
  const { user, isAuthenticated, login, register, logout, updateUser, demoAccounts, loginAsDemo } = useAuth();
  const { setRole, savedJourneys } = useAccessibility();

  // Mode for authenticated users: 'VIEW' or 'EDIT'
  const [profileViewMode, setProfileViewMode] = useState<'VIEW' | 'EDIT'>('VIEW');

  // Mode for unauthenticated users: 'LOGIN' or 'REGISTER'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login & Registration state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([
    'Wheelchair (0-Stairs)',
    '1:12 Ramp Slope',
    'Accessible Restroom',
  ]);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [editBadge, setEditBadge] = useState(user?.badge || '');
  const [editNeeds, setEditNeeds] = useState<string[]>(user?.accessibilityNeeds || []);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when user changes or modal opens
  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditAvatarUrl(user.avatarUrl || '');
      setEditBadge(user.badge || '');
      setEditNeeds(user.accessibilityNeeds || []);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleNeedToggle = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleEditNeedToggle = (need: string) => {
    setEditNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await login(email, selectedRole);
      setRole(selectedRole);
      setAuthSuccessMsg(`Welcome back to AccessWay!`);
      setTimeout(() => {
        setAuthSuccessMsg('');
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsLoading(true);
    try {
      await register(name, email, selectedRole, selectedNeeds);
      setRole(selectedRole);
      setAuthSuccessMsg(`Account created successfully! Welcome, ${name}.`);
      setTimeout(() => {
        setAuthSuccessMsg('');
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
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
        onClose();
      }, 700);
    }
  };

  // Handle Photo File Upload (converts to base64 data URL for local storage persistence)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditAvatarUrl(event.target.result as string);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Apply custom URL
  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setEditAvatarUrl(customUrlInput.trim());
      setCustomUrlInput('');
      setShowUrlInput(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Please enter a valid name.');
      return;
    }

    updateUser({
      name: editName.trim(),
      avatarUrl: editAvatarUrl.trim(),
      badge: editBadge.trim() || undefined,
      accessibilityNeeds: editNeeds,
    });

    setAuthSuccessMsg('Profile updated successfully!');
    setProfileViewMode('VIEW');
    setTimeout(() => {
      setAuthSuccessMsg('');
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl ${
          isAuthenticated ? 'max-w-xl' : 'max-w-5xl'
        } w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button for Video Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-2xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-105"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isAuthenticated && user ? (
          <>
            {/* Authenticated Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-black">
                  ♿
                </div>
                <div>
                  <h2 id="auth-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
                    {profileViewMode === 'EDIT'
                      ? 'Edit Profile & Photo'
                      : 'Your Traveler Profile'}
                  </h2>
                  <p className="text-xs text-blue-100">
                    {profileViewMode === 'EDIT'
                      ? 'Update your display name, photo, and universal access preferences'
                      : 'Manage offline passes, verified certifications, and account identity'}
                  </p>
                </div>
              </div>
            </div>

            {/* Success toast banner */}
            {authSuccessMsg && (
              <div className="bg-emerald-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 animate-fade-in shadow-inner">
                <CheckCircle2 className="w-4 h-4" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {profileViewMode === 'EDIT' ? (
                /* --- PROFILE EDIT MODE --- */
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* 1. Profile Photo Changer */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Change Profile Photo</span>
                      </span>
                      <span className="text-[11px] text-slate-400 lowercase font-normal">
                        file upload, preset, or image URL
                      </span>
                    </label>

                    {/* Current Preview with Action Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      <div className="relative group shrink-0">
                        {editAvatarUrl ? (
                          <img
                            src={editAvatarUrl}
                            alt="Avatar preview"
                            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-md"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center ring-4 ring-blue-500/30 shadow-md">
                            {editName ? editName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}

                        {/* Hidden File Input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          className="hidden"
                        />

                        {/* Quick upload overlay button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[10px] font-bold"
                          title="Upload new photo"
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span>Upload</span>
                        </button>
                      </div>

                      {/* Upload / URL Action Buttons */}
                      <div className="flex flex-wrap gap-2 flex-1 w-full">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploading ? 'Loading Image...' : 'Upload from Device'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="py-2 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>Image URL</span>
                        </button>

                        {editAvatarUrl && (
                          <button
                            type="button"
                            onClick={() => setEditAvatarUrl('')}
                            className="py-2 px-3 bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Remove photo & use initials"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Custom URL Input Box (Collapsible) */}
                    {showUrlInput && (
                      <div className="pt-2 flex gap-2 animate-fade-in">
                        <input
                          type="url"
                          placeholder="Paste image link (https://...)"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {/* Preset Avatars Gallery */}
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                        Or Pick a Curated Accessible Profile Avatar:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {PRESET_AVATARS.map((avatar) => {
                          const isSelected = editAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setEditAvatarUrl(avatar.url)}
                              className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                                isSelected
                                  ? 'border-blue-600 ring-2 ring-blue-500/40 scale-105 shadow-md'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 opacity-80 hover:opacity-100'
                              }`}
                              title={avatar.name}
                            >
                              <img
                                src={avatar.url}
                                alt={avatar.name}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-white">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2. Full Name & Tagline */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Display Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Alex Rivera"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        This name appears on your verified hotel reservations and offline trip passes.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Traveler Tagline / Badge
                      </label>
                      <div className="relative">
                        <Award className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={editBadge}
                          onChange={(e) => setEditBadge(e.target.value)}
                          placeholder="e.g. Power Wheelchair Explorer, Solo Heritage Traveler"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Accessibility Needs */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Your Primary Accessibility Preferences
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        'Wheelchair (0-Stairs)',
                        '1:12 Ramp Slope',
                        'Accessible Restroom',
                        'Audio Navigation',
                        'Tactile Paving',
                        'Quiet / Low Crowd',
                        'Service Dog Access',
                        'High Contrast Text',
                      ].map((item) => (
                        <label
                          key={item}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={editNeeds.includes(item)}
                            onChange={() => handleEditNeedToggle(item)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setProfileViewMode('VIEW')}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* --- PROFILE VIEW MODE --- */
                <div className="space-y-6">
                  {/* User Identity Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-16 h-16 rounded-2xl object-cover ring-4 ring-blue-600/20 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center ring-4 ring-blue-600/20 shadow-md shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                            {user.name}
                          </h3>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              user.role === 'AUDITOR'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {user.role === 'AUDITOR'
                              ? '🛡️ Certified Auditor'
                              : user.role === 'ADMIN'
                              ? '⚙️ Transit Admin'
                              : '🧑‍🦽 Accessible Traveler'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          {user.badge}
                        </p>
                      </div>
                    </div>

                    {/* Edit Profile Button */}
                    <button
                      onClick={() => {
                        setEditName(user.name);
                        setEditAvatarUrl(user.avatarUrl || '');
                        setEditBadge(user.badge || '');
                        setEditNeeds(user.accessibilityNeeds || []);
                        setProfileViewMode('EDIT');
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-200 dark:border-slate-700 shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Name & Photo</span>
                    </button>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                        {savedJourneys.length}
                      </span>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        Offline Trips
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {user.savedDestinations.length}
                      </span>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        Bookmarked
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {user.joinedDate}
                      </span>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        Member Since
                      </p>
                    </div>
                  </div>

                  {/* Auditor / Admin Credentials if applicable */}
                  {user.certificationId && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
                        <Award className="w-4 h-4" />
                        <span>Statutory Inspection Badge</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-400 font-mono text-[11px]">
                        ID: {user.certificationId}
                      </p>
                    </div>
                  )}

                  {/* Configured Accessibility Needs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Active Accessibility Profile
                      </label>
                      <button
                        onClick={() => setProfileViewMode('EDIT')}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        Change Preferences
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.accessibilityNeeds.map((need, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{need}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {onNavigateToTrips && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTrips();
                        }}
                        className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>View Offline Trips ({savedJourneys.length})</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        onClose();
                        if (onSignOut) {
                          onSignOut();
                        }
                      }}
                      className="py-3 px-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  {/* Switch Demo Account Shortcut */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Switch Demo Account (1-Click Test)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => handleDemoSelect(acc.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-bold ${
                            user.id === acc.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <img
                            src={acc.avatarUrl}
                            alt={acc.name}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate">{acc.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {acc.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* When unauthenticated, render the full cinematic AuthPage with video animations */
          <div className="w-full">
            <AuthPage
              isModal={true}
              onSuccess={onClose}
              initialMode={authMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};
