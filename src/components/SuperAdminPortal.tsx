import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Power,
  PauseCircle,
  PlayCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  BellOff,
  Bell,
  RefreshCw,
  Trash2,
  Clock,
} from 'lucide-react';
import { BrandEmblem } from './BrandEmblem.tsx';
import { ResetConfirmModal } from './ResetConfirmModal.tsx';
import { CafeInfo, PortalTarget, ServiceControlState, SuperAdminLogEntry } from '../types/index.ts';
import {
  DEFAULT_PAUSE_MESSAGE,
  DEFAULT_PAUSE_TITLE,
  clearRememberedPortalEmail,
  getRememberedPortalEmail,
} from '../lib/serviceControl.ts';
import {
  claimFirstRunPortalAccount,
  completeSupabasePasswordRecovery,
  getPortalAuthStatus,
  sendSupabasePasswordReset,
  signInToPortal,
  signOutFromPortal,
  signUpSupabaseStaffAccount,
} from '../lib/portalAuth.ts';
import { DEFAULT_CAFE_INFO } from '../lib/menuDefaults.ts';

interface SuperAdminPortalProps {
  serviceControl: ServiceControlState;
  onUpdateServiceControl: (next: ServiceControlState) => void;
  brandLogo?: string | null;
  cafeInfo?: CafeInfo;
  totalDishesCount: number;
  totalCategoriesCount: number;
  activePopupsCount: number;
  totalPopupsCount: number;
  onResetMenuDefaults: () => void;
  onResetPopupDefaults: () => void;
  onResetCafeInfoDefaults: () => void;
  onNavigatePortal: (target: PortalTarget) => void;
}

const createLogEntry = (action: string, detail: string): SuperAdminLogEntry => ({
  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  action,
  detail,
  timestamp: new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
});

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  serviceControl,
  onUpdateServiceControl,
  brandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  totalDishesCount,
  totalCategoriesCount,
  activePopupsCount,
  totalPopupsCount,
  onResetMenuDefaults,
  onResetPopupDefaults,
  onResetCafeInfoDefaults,
  onNavigatePortal,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'supabase' | 'server'>('server');
  const [needsFirstRunSetup, setNeedsFirstRunSetup] = useState<boolean>(false);
  const [serverUnavailable, setServerUnavailable] = useState<boolean>(false);
  const [supabaseActionMode, setSupabaseActionMode] = useState<'signin' | 'signup' | 'recovery'>('signin');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [rememberedEmail, setRememberedEmail] = useState<string>(() =>
    getRememberedPortalEmail('superadmin')
  );
  const [emailInput, setEmailInput] = useState<string>(() =>
    getRememberedPortalEmail('superadmin')
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');

  // Draft maintenance notice fields
  const [draftTitle, setDraftTitle] = useState(serviceControl.pauseTitle);
  const [draftMessage, setDraftMessage] = useState(serviceControl.pauseMessage);
  const [noticeStatus, setNoticeStatus] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<'menu' | 'popups' | 'cafeInfo' | null>(null);

  useEffect(() => {
    setDraftTitle(serviceControl.pauseTitle);
    setDraftMessage(serviceControl.pauseMessage);
  }, [serviceControl.pauseTitle, serviceControl.pauseMessage]);

  useEffect(() => {
    let cancelled = false;
    setIsAuthChecking(true);
    void getPortalAuthStatus('superadmin')
      .then((status) => {
        if (cancelled) return;
        setAuthMode(status.mode);
        setNeedsFirstRunSetup(status.needsFirstRunSetup);
        setServerUnavailable(Boolean(status.serverUnavailable));
        if (status.needsPasswordRecovery) {
          setSupabaseActionMode('recovery');
          if (status.email) setEmailInput(status.email);
        }
        setIsAuthenticated(Boolean(status.authenticated));
      })
      .finally(() => {
        if (!cancelled) setIsAuthChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPasswordCreateFlow =
    (needsFirstRunSetup && authMode === 'server') ||
    (authMode === 'supabase' && (supabaseActionMode === 'signup' || supabaseActionMode === 'recovery'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;

    if (isPasswordCreateFlow) {
      if (passwordInput.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      if (passwordInput !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setIsAuthSubmitting(true);
    setAuthError('');
    setAuthInfo('');
    try {
      let result;
      if (authMode === 'supabase' && supabaseActionMode === 'recovery') {
        result = await completeSupabasePasswordRecovery({
          role: 'superadmin',
          newPassword: passwordInput,
          rememberMe,
        });
      } else if (authMode === 'supabase' && supabaseActionMode === 'signup') {
        result = await signUpSupabaseStaffAccount({
          role: 'superadmin',
          email: emailInput,
          password: passwordInput,
          rememberMe,
        });
      } else if (needsFirstRunSetup && authMode === 'server') {
        result = await claimFirstRunPortalAccount({
          role: 'superadmin',
          email: emailInput,
          password: passwordInput,
          rememberMe,
        });
      } else {
        result = await signInToPortal({
          role: 'superadmin',
          email: emailInput,
          password: passwordInput,
          rememberMe,
        });
      }

      if (result.ok) {
        const normalizedEmail = (result.email || emailInput).trim();
        setRememberedEmail(rememberMe ? normalizedEmail : '');
        setNeedsFirstRunSetup(false);
        setSupabaseActionMode('signin');
        setIsAuthenticated(true);
        setAuthError('');
        setAuthInfo('');
        setPasswordInput('');
        setConfirmPassword('');
        setRememberMe(false);
      } else if (result.pendingEmailConfirmation && result.info) {
        setAuthInfo(result.info);
        setSupabaseActionMode('signin');
        setPasswordInput('');
        setConfirmPassword('');
      } else {
        setAuthError(result.error || 'Authentication failed.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthError('');
    setAuthInfo('');
    try {
      const result = await sendSupabasePasswordReset({
        role: 'superadmin',
        email: emailInput,
      });
      if (result.ok && result.info) {
        setAuthInfo(result.info);
      } else {
        setAuthError(result.error || 'Unable to send password reset email.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutFromPortal('superadmin');
    const savedEmail = getRememberedPortalEmail('superadmin');
    setIsAuthenticated(false);
    setRememberedEmail(savedEmail);
    setEmailInput(savedEmail);
    setPasswordInput('');
    setConfirmPassword('');
    setRememberMe(false);
    setAuthError('');
    setAuthInfo('');
  };

  const handleForgetSavedEmail = () => {
    clearRememberedPortalEmail('superadmin');
    setRememberedEmail('');
    setEmailInput('');
    setAuthError('');
    setAuthInfo('');
  };

  const appendUpdate = (
    patch: Partial<ServiceControlState>,
    logAction: string,
    logDetail: string
  ) => {
    const nextLog = [createLogEntry(logAction, logDetail), ...serviceControl.actionLog].slice(0, 20);
    onUpdateServiceControl({
      ...serviceControl,
      ...patch,
      updatedAt: new Date().toISOString(),
      actionLog: nextLog,
    });
  };

  const handleToggleServicePause = () => {
    const nextPaused = !serviceControl.isPaused;
    appendUpdate(
      { isPaused: nextPaused },
      nextPaused ? 'Service Paused' : 'Service Resumed',
      nextPaused
        ? 'Customer storefront switched to maintenance screen.'
        : 'Customer storefront restored to live menu.'
    );
  };

  const handleSaveMaintenanceNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = draftTitle.trim() || DEFAULT_PAUSE_TITLE;
    const cleanMessage = draftMessage.trim() || DEFAULT_PAUSE_MESSAGE;
    setDraftTitle(cleanTitle);
    setDraftMessage(cleanMessage);
    appendUpdate(
      { pauseTitle: cleanTitle, pauseMessage: cleanMessage },
      'Notice Updated',
      cleanTitle
    );
    setNoticeStatus('Maintenance notice saved.');
  };

  const handleToggleAdminLock = () => {
    const nextLocked = !serviceControl.isAdminLocked;
    appendUpdate(
      { isAdminLocked: nextLocked },
      nextLocked ? 'Admin Portal Locked' : 'Admin Portal Unlocked',
      nextLocked
        ? 'Suspended Admin Portal access for store managers.'
        : 'Restored Admin Portal access.'
    );
  };

  const handleToggleSuppressPopups = () => {
    const nextSuppressed = !serviceControl.suppressPopups;
    appendUpdate(
      { suppressPopups: nextSuppressed },
      nextSuppressed ? 'Pop-ups Suppressed' : 'Pop-ups Restored',
      nextSuppressed
        ? 'Globally hid promotional pop-up banners.'
        : 'Allowed scheduled promotional pop-up banners.'
    );
  };

  const handleClearLog = () => {
    onUpdateServiceControl({
      ...serviceControl,
      actionLog: [],
    });
  };

  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#18110D] text-[#FFFDF9] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#FDBA74] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#D8C7B6]">
            Verifying Super Admin session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#18110D] text-[#FFFDF9] flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#FFFDF9] text-[#2C1C12] rounded-3xl shadow-2xl border border-[#4A3222] overflow-hidden">
          <div className="bg-gradient-to-br from-[#23150E] via-[#342015] to-[#43291B] text-white px-6 py-6 flex flex-col items-center text-center">
            <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="md" />
            <span className="mt-3 text-[10px] uppercase tracking-[0.25em] font-bold text-[#FDBA74]">
              {needsFirstRunSetup && authMode === 'server'
                ? 'FIRST-RUN SUPER ADMIN SETUP'
                : 'SUPER ADMIN CONTROL PLANE'}
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1">
              {cafeName}
            </h1>
            <p className="text-xs text-[#D8C7B6] mt-1">
              {needsFirstRunSetup && authMode === 'server'
                ? 'Set the initial Super Admin login. Setup locks automatically once claimed.'
                : 'Sign in to manage service uptime, maintenance mode, and admin access.'}
            </p>
          </div>

          <form onSubmit={(e) => void handleLogin(e)} className="p-6 space-y-4 text-xs">
            {authMode === 'supabase' ? (
              <div className="space-y-2.5">
                <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                  Secured by <strong>Supabase Auth</strong> &amp; <code className="font-mono">superadmin</code> role check.
                </div>
                {supabaseActionMode !== 'recovery' && (
                  <div
                    role="tablist"
                    aria-label="Super Admin authentication mode"
                    className="grid grid-cols-2 p-1 rounded-xl bg-[#FAF6EE] border border-[#E6DACB] gap-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={supabaseActionMode === 'signin'}
                      onClick={() => {
                        setSupabaseActionMode('signin');
                        setAuthError('');
                        setAuthInfo('');
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        supabaseActionMode === 'signin'
                          ? 'bg-[#2D1B11] text-white shadow-2xs'
                          : 'text-[#6B5746] hover:text-[#2C1C12]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={supabaseActionMode === 'signup'}
                      onClick={() => {
                        setSupabaseActionMode('signup');
                        setAuthError('');
                        setAuthInfo('');
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        supabaseActionMode === 'signup'
                          ? 'bg-[#2D1B11] text-white shadow-2xs'
                          : 'text-[#6B5746] hover:text-[#2C1C12]'
                      }`}
                    >
                      First-Time Setup
                    </button>
                  </div>
                )}
                {supabaseActionMode === 'signup' && (
                  <p className="text-[11px] text-[#6B5746] leading-relaxed">
                    Creates your Supabase Auth login password. Only emails assigned{' '}
                    <code className="font-mono font-semibold">superadmin</code> in{' '}
                    <code className="font-mono font-semibold">authorized_staff</code> can unlock this console.
                  </p>
                )}
                {supabaseActionMode === 'recovery' && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    Password reset verified. Choose a new password (min 8 characters) to continue.
                  </div>
                )}
              </div>
            ) : (
              serverUnavailable && (
                <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-1">
                  <p className="font-bold">Supabase Environment Variables Missing</p>
                  <p>
                    This static host has no backend auth API. Add{' '}
                    <code className="font-mono font-semibold">VITE_SUPABASE_URL</code> and{' '}
                    <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> in{' '}
                    <strong>Vercel → Project Settings → Environment Variables</strong>, then redeploy.
                  </p>
                </div>
              )
            )}

            {supabaseActionMode !== 'recovery' && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="superadmin-id" className="block font-bold text-[#5C4533]">
                    Super Admin ID (Email)
                  </label>
                  {rememberedEmail && (
                    <button
                      type="button"
                      onClick={handleForgetSavedEmail}
                      className="text-[11px] font-semibold text-[#D4621A] hover:underline cursor-pointer"
                    >
                      Forget email
                    </button>
                  )}
                </div>
                <input
                  id="superadmin-id"
                  type="email"
                  required
                  autoFocus={!rememberedEmail}
                  autoComplete="username"
                  placeholder="Enter super admin email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setAuthError('');
                    setAuthInfo('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="superadmin-password" className="block font-bold text-[#5C4533]">
                  {supabaseActionMode === 'recovery'
                    ? 'New Password (min 8 characters)'
                    : isPasswordCreateFlow
                    ? 'Create Password (min 8 characters)'
                    : 'Password'}
                </label>
                {authMode === 'supabase' && supabaseActionMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={isAuthSubmitting}
                    className="text-[11px] font-semibold text-[#D4621A] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="superadmin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isPasswordCreateFlow ? 8 : undefined}
                  autoFocus={Boolean(rememberedEmail) || supabaseActionMode === 'recovery'}
                  autoComplete={isPasswordCreateFlow ? 'new-password' : 'current-password'}
                  placeholder={isPasswordCreateFlow ? 'At least 8 characters' : 'Enter password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8C7662] hover:text-[#2C1C12] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isPasswordCreateFlow && (
              <div>
                <label
                  htmlFor="superadmin-confirm-password"
                  className="block font-bold text-[#5C4533] mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="superadmin-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-2 focus:ring-[#D4621A]"
                />
              </div>
            )}

            <label
              htmlFor="superadmin-remember-me"
              className="min-h-[44px] flex items-start gap-2.5 py-1.5 px-2.5 -mx-1 rounded-xl hover:bg-[#FAF6EE] transition-colors cursor-pointer select-none"
            >
              <input
                id="superadmin-remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#CBB8A3] accent-[#D4621A] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4621A] focus-visible:ring-offset-1"
              />
              <span className="flex flex-col">
                <span className="text-xs font-semibold text-[#2C1C12] leading-snug">
                  Remember me for 30 days
                </span>
                <span className="text-[11px] text-[#7A6452] leading-snug">
                  Keeps you signed in and saves your email on this device
                </span>
              </span>
            </label>

            {authInfo && (
              <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-200 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authInfo}</span>
              </div>
            )}

            {authError && (
              <div className="flex items-start gap-2 text-rose-700 bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-200 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthSubmitting}
              className="w-full min-h-[42px] py-2.5 rounded-xl bg-[#2D1B11] hover:bg-[#1E120B] text-white font-semibold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isAuthSubmitting
                ? 'Verifying...'
                : authMode === 'supabase' && supabaseActionMode === 'recovery'
                ? 'Update Password & Sign In'
                : authMode === 'supabase' && supabaseActionMode === 'signup'
                ? 'Activate Super Admin Account'
                : needsFirstRunSetup && authMode === 'server'
                ? 'Create Super Admin & Sign In'
                : 'Sign In to Super Admin'}
            </button>

            <div className="pt-2 border-t border-[#F0E6D8] flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => onNavigatePortal('customer')}
                className="text-[#8C7662] hover:text-[#2C1C12] font-medium cursor-pointer"
              >
                &larr; Return to Storefront
              </button>
              <button
                type="button"
                onClick={() => onNavigatePortal('admin')}
                className="text-[#D4621A] hover:underline font-semibold cursor-pointer"
              >
                Go to Admin Portal &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#2C1C12] flex flex-col">
      {/* Top Operations Bar */}
      <header className="sticky top-0 z-30 bg-[#1F140E] text-white border-b border-[#3D281C] px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="sm" />
            <div>
              <div className="flex items-center gap-2 text-xs text-[#FDBA74] font-semibold">
                <span>{cafeName}</span>
                <span aria-hidden="true">/</span>
                <span>Super Admin Console</span>
              </div>
              <h1 className="font-serif text-base sm:text-lg font-bold text-white leading-tight">
                Service &amp; Operations Control
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigatePortal('customer')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#FFFDF9] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Storefront</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigatePortal('admin')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#FDBA74] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Admin Portal</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Live Metrics Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-[#EDE2D2]">
            <span className="text-[11px] font-semibold text-[#8C7662] block">
              Storefront Status
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              {serviceControl.isPaused ? (
                <>
                  <PauseCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-serif text-lg font-bold text-rose-700">Paused</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-serif text-lg font-bold text-emerald-700">Service Live</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EDE2D2]">
            <span className="text-[11px] font-semibold text-[#8C7662] block">
              Admin Portal Access
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              {serviceControl.isAdminLocked ? (
                <>
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-serif text-lg font-bold text-amber-800">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-serif text-lg font-bold text-[#2C1C12]">Enabled</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EDE2D2]">
            <span className="text-[11px] font-semibold text-[#8C7662] block">
              Active Menu Catalog
            </span>
            <div className="mt-1.5 font-mono text-lg font-bold text-[#2C1C12] tabular-nums">
              {totalDishesCount} dishes · {totalCategoriesCount} cats
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EDE2D2]">
            <span className="text-[11px] font-semibold text-[#8C7662] block">
              Promotional Pop-ups
            </span>
            <div className="mt-1.5 font-mono text-lg font-bold text-[#2C1C12] tabular-nums">
              {serviceControl.suppressPopups
                ? 'Suppressed'
                : `${activePopupsCount} / ${totalPopupsCount} active`}
            </div>
          </div>
        </section>

        {/* Primary Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Service Pause / Resume & Custom Maintenance Notice */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EDE2D2] space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EFE5D6]">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#2C1C12]">
                  Service Availability &amp; Maintenance
                </h2>
                <p className="text-xs text-[#8C7662] mt-0.5">
                  Pause the customer storefront immediately or resume live menu service.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleServicePause}
                className={`min-h-[42px] px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                  serviceControl.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{serviceControl.isPaused ? 'Resume Service' : 'Pause Service'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceNotice} className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor="pause-title"
                  className="block font-bold text-[#5C4533] mb-1.5"
                >
                  Maintenance Headline
                </label>
                <input
                  id="pause-title"
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setNoticeStatus(null);
                  }}
                  placeholder="e.g. Service Temporarily Paused"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              <div>
                <label
                  htmlFor="pause-message"
                  className="block font-bold text-[#5C4533] mb-1.5"
                >
                  Customer Maintenance Notice
                </label>
                <textarea
                  id="pause-message"
                  rows={3}
                  required
                  value={draftMessage}
                  onChange={(e) => {
                    setDraftMessage(e.target.value);
                    setNoticeStatus(null);
                  }}
                  placeholder="Explain when the café menu will reopen or how to contact staff..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF7EE] border border-[#EAE0D2] text-[11px] text-[#6B5746] space-y-1">
                <span className="font-bold text-[#2C1C12] block">
                  Contact shown on Maintenance Screen:
                </span>
                <div>{cafeInfo.openingHours} · {cafeInfo.contactNumber}</div>
                <div className="text-[#8C7662]">{cafeInfo.location}</div>
              </div>

              {noticeStatus && (
                <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{noticeStatus}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(DEFAULT_PAUSE_TITLE);
                    setDraftMessage(DEFAULT_PAUSE_MESSAGE);
                    setNoticeStatus(null);
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] font-semibold transition-colors cursor-pointer"
                >
                  Reset Notice Text
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Save Maintenance Notice
                </button>
              </div>
            </form>
          </section>

          {/* Card 2: Admin Governance & Storefront Controls */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EDE2D2] space-y-4">
            <div className="pb-4 border-b border-[#EFE5D6]">
              <h2 className="font-serif text-lg font-bold text-[#2C1C12]">
                Admin Access &amp; Storefront Controls
              </h2>
              <p className="text-xs text-[#8C7662] mt-0.5">
                Control manager portal access, pop-up banners, and storefront resets.
              </p>
            </div>

            {/* Lock / Unlock Admin Panel */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#EDE2D2] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-xs">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#2C1C12]">
                  {serviceControl.isAdminLocked ? (
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>Admin Portal Access</span>
                </div>
                <p className="text-[11px] text-[#8C7662] leading-snug">
                  {serviceControl.isAdminLocked
                    ? 'Admin edits are currently locked. Managers see a suspension notice.'
                    : 'Managers can sign in and edit dishes, banners, and café info.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleAdminLock}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  serviceControl.isAdminLocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {serviceControl.isAdminLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock Admin</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Admin</span>
                  </>
                )}
              </button>
            </div>

            {/* Suppress Promotional Pop-ups */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#EDE2D2] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-xs">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#2C1C12]">
                  {serviceControl.suppressPopups ? (
                    <BellOff className="w-4 h-4 text-[#D4621A]" />
                  ) : (
                    <Bell className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>Promotional Pop-ups Override</span>
                </div>
                <p className="text-[11px] text-[#8C7662] leading-snug">
                  {serviceControl.suppressPopups
                    ? 'All customer pop-up banners are muted by Super Admin.'
                    : 'Active scheduled pop-ups appear normally to customers.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleSuppressPopups}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  serviceControl.suppressPopups
                    ? 'bg-[#D4621A] text-white border-[#D4621A] hover:bg-[#B84E0F]'
                    : 'bg-white text-[#5C4533] border-[#E0D2C2] hover:bg-[#EFE5D6]'
                }`}
              >
                {serviceControl.suppressPopups ? 'Allow Pop-ups' : 'Mute Pop-ups'}
              </button>
            </div>

            {/* Emergency Storefront Resets */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-[#5C4533] block">
                Storefront Data Resets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget('menu')}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>Reset Menu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget('popups')}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>Reset Pop-ups</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget('cafeInfo')}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>Reset Café Info</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Super Admin Action Audit Log */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EDE2D2] space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EFE5D6]">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#2C1C12]">
                Super Admin Action Log
              </h2>
              <p className="text-[11px] text-[#8C7662]">
                Chronological history of service availability and governance actions.
              </p>
            </div>

            {serviceControl.actionLog.length > 0 && (
              <button
                type="button"
                onClick={handleClearLog}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#6B5746] border border-[#E0D2C2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Log</span>
              </button>
            )}
          </div>

          {serviceControl.actionLog.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C7662]">
              No Super Admin actions recorded yet. Pause service, update the notice, or toggle Admin access above.
            </div>
          ) : (
            <div className="divide-y divide-[#F5EFE7]">
              {serviceControl.actionLog.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-[#2C1C12] whitespace-nowrap">
                      {entry.action}
                    </span>
                    <span className="text-[#6B5746] truncate">{entry.detail}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#8C7662] flex items-center gap-1 tabular-nums shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{entry.timestamp}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Two-Step Confirmation for Emergency Resets */}
      <ResetConfirmModal
        isOpen={Boolean(resetTarget)}
        itemLabel={
          resetTarget === 'menu'
            ? 'Menu & Categories'
            : resetTarget === 'popups'
            ? 'Promotional Pop-ups'
            : 'Café Info'
        }
        step1Description="This Super Admin action will restore default storefront data across all customer views."
        step2Description="This action cannot be undone. Confirm restoring default settings now?"
        confirmLabel="Confirm Reset"
        onConfirm={() => {
          if (resetTarget === 'menu') {
            onResetMenuDefaults();
            appendUpdate({}, 'Menu Reset', 'Restored default menu dishes & categories.');
          } else if (resetTarget === 'popups') {
            onResetPopupDefaults();
            appendUpdate({}, 'Pop-ups Reset', 'Restored default promotional banners.');
          } else if (resetTarget === 'cafeInfo') {
            onResetCafeInfoDefaults();
            appendUpdate({}, 'Café Info Reset', 'Restored default hours, location, phone, and Wi-Fi.');
          }
          setResetTarget(null);
        }}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
};
