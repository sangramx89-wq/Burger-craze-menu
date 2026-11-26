import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Database,
  Radio,
  Image as ImageIcon,
  Layers,
  UploadCloud,
  DownloadCloud,
  KeyRound,
} from 'lucide-react';
import { RealtimeSyncStatus } from '../lib/realtimeMenuSync.ts';
import {
  SUPABASE_SETUP_SQL,
  SupabaseDiagnosticsReport,
  runSupabaseDiagnostics,
} from '../lib/supabaseDiagnostics.ts';

interface LiveSyncAdminProps {
  syncStatus: RealtimeSyncStatus;
  lastSyncError?: string | null;
  lastSyncedAt?: string | null;
  onForcePushToCloud?: () => Promise<{ ok: boolean; error?: string }>;
  onPullFromCloud?: () => Promise<{ ok: boolean; found: boolean; error?: string }>;
}

export const LiveSyncAdmin: React.FC<LiveSyncAdminProps> = ({
  syncStatus,
  lastSyncError = null,
  lastSyncedAt = null,
  onForcePushToCloud,
  onPullFromCloud,
}) => {
  const [report, setReport] = useState<SupabaseDiagnosticsReport | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showFullSql, setShowFullSql] = useState(false);

  const runChecks = useCallback(async () => {
    setIsChecking(true);
    try {
      const next = await runSupabaseDiagnostics();
      setReport(next);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2400);
    } catch {
      setShowFullSql(true);
    }
  };

  const handlePush = async () => {
    if (!onForcePushToCloud || isPushing) return;
    setIsPushing(true);
    setActionNotice(null);
    try {
      const res = await onForcePushToCloud();
      if (res.ok) {
        setActionNotice({
          type: 'success',
          text: 'Current menu, availability, branding, and pop-ups pushed to Supabase.',
        });
        await runChecks();
      } else {
        setActionNotice({
          type: 'error',
          text: res.error || 'Failed to push menu snapshot to Supabase.',
        });
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (!onPullFromCloud || isPulling) return;
    setIsPulling(true);
    setActionNotice(null);
    try {
      const res = await onPullFromCloud();
      if (res.error) {
        setActionNotice({ type: 'error', text: res.error });
      } else if (!res.found) {
        setActionNotice({
          type: 'error',
          text: 'No saved snapshot found in Supabase yet. Tap "Push Current Menu to Cloud" to upload yours.',
        });
      } else {
        setActionNotice({
          type: 'success',
          text: 'Pulled latest storefront menu & availability from Supabase.',
        });
      }
      await runChecks();
    } finally {
      setIsPulling(false);
    }
  };

  const allBackendChecksReady = Boolean(
    report?.configured &&
      report.storefrontTable.ok &&
      report.popupsTable.ok &&
      report.storageBucket.ok
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
      {/* Top Status Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          !report?.configured
            ? 'bg-amber-50/75 border-amber-200'
            : allBackendChecksReady && !lastSyncError
            ? 'bg-emerald-50/75 border-emerald-200'
            : 'bg-rose-50/75 border-rose-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !report?.configured
                ? 'bg-amber-100 text-amber-800'
                : allBackendChecksReady && !lastSyncError
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {!report?.configured ? (
              <KeyRound className="w-5 h-5" />
            ) : allBackendChecksReady && !lastSyncError ? (
              <Radio className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="font-serif text-base sm:text-lg font-bold text-[#2C1C12]">
              {!report?.configured
                ? report?.configStatus.issue === 'invalid-url'
                  ? 'Invalid Supabase Project URL'
                  : report?.configStatus.issue === 'missing-url' ||
                    report?.configStatus.issue === 'missing-key'
                  ? 'Incomplete Supabase Configuration'
                  : 'Local-Only Mode (Supabase Env Vars Missing)'
                : allBackendChecksReady && !lastSyncError
                ? syncStatus === 'live'
                  ? 'Supabase Connected & Live Sync Active'
                  : 'Supabase Schema Ready'
                : 'Supabase Connected — Attention Needed'}
            </h2>
            <p className="text-xs text-[#5C4533] leading-relaxed">
              {!report?.configured
                ? report?.configStatus.errorMessage ||
                  'Edits currently save in this browser only. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel Environment Variables, then trigger a fresh Redeploy.'
                : allBackendChecksReady && !lastSyncError
                ? `Connected to ${report.configStatus.host || 'Supabase'}${
                    report.staffSession?.authorized
                      ? ` as ${report.staffSession.email} (${report.staffSession.role})`
                      : ''
                  }. Any dish, availability, branding, or pop-up change persists in Postgres and syncs live to customer phones.`
                : lastSyncError ||
                  report?.staffSession?.error ||
                  report?.storefrontTable.error ||
                  report?.popupsTable.error ||
                  report?.storageBucket.error ||
                  'Run the SQL Setup Script in your Supabase SQL Editor to finish configuring tables, Realtime, and storage.'}
            </p>
            {!report?.configured && report?.configStatus.missingVars && report.configStatus.missingVars.length > 0 && (
              <p className="text-[11px] font-medium text-[#9A3412]">
                Missing in build: <code className="font-mono">{report.configStatus.missingVars.join(', ')}</code>
              </p>
            )}
            {!report?.configured && (
              <p className="text-[11px] text-[#7A6452] leading-relaxed">
                Already added in Vercel? Ensure both variables are enabled for <strong>Production</strong>, then open Vercel <strong>Deployments → Redeploy</strong> (uncheck build cache) because Vite injects <code className="font-mono">VITE_*</code> variables at build time.
              </p>
            )}
            {lastSyncedAt && (
              <p className="text-[11px] font-medium text-emerald-800 tabular-nums">
                Last cloud sync: {new Date(lastSyncedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={isChecking}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#2C1C12] border border-[#E0D2C2] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </button>

          {report?.configured && onForcePushToCloud && (
            <button
              type="button"
              onClick={() => void handlePush()}
              disabled={isPushing}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isPushing ? 'Pushing...' : 'Push Menu to Cloud'}</span>
            </button>
          )}

          {report?.configured && onPullFromCloud && (
            <button
              type="button"
              onClick={() => void handlePull()}
              disabled={isPulling}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#5C4533] border border-[#E0D2C2] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>{isPulling ? 'Pulling...' : 'Pull Latest'}</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div
          role="status"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* 4 Live Diagnostics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-[#EDE2D2] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7662] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Env Variables</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                report?.configured
                  ? 'text-emerald-700'
                  : report?.configStatus.issue === 'invalid-url'
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {report?.configured
                ? 'Detected'
                : report?.configStatus.issue === 'invalid-url'
                ? 'Invalid URL'
                : report?.configStatus.issue === 'missing-url'
                ? 'URL Missing'
                : report?.configStatus.issue === 'missing-key'
                ? 'Key Missing'
                : 'Missing'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B5746]">
            {report?.configured
              ? `Host: ${report.configStatus.host || 'Supabase'} · Realtime: ${
                  syncStatus === 'live'
                    ? 'Live'
                    : syncStatus === 'connecting'
                    ? 'Connecting'
                    : 'REST Fallback'
                }${
                  report.staffSession?.signedIn
                    ? report.staffSession.authorized
                      ? ' · Staff Auth OK'
                      : ' · Staff Auth Error'
                    : ''
                }.`
              : report?.configStatus.errorMessage ||
                'Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY and redeploy.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-[#EDE2D2] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7662] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Storefront State</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                !report?.configured
                  ? 'text-[#8C7662]'
                  : report.storefrontTable.ok
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {!report?.configured
                ? 'Pending'
                : report.storefrontTable.ok
                ? report.storefrontTable.hasSeedRow
                  ? 'Ready'
                  : 'Empty'
                : 'Error'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B5746]">
            {report?.storefrontTable.ok
              ? report.storefrontTable.hasSeedRow
                ? `Live menu snapshot stored (rev ${report.storefrontTable.revision ?? 0}).`
                : 'Table ready — push your menu once to seed the cloud row.'
              : report?.storefrontTable.error || 'Awaiting Supabase configuration.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-[#EDE2D2] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7662] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Pop-ups Table</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                !report?.configured
                  ? 'text-[#8C7662]'
                  : report.popupsTable.ok
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {!report?.configured
                ? 'Pending'
                : report.popupsTable.ok
                ? `Ready (${report.popupsTable.rowCount ?? 0})`
                : 'Error'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B5746]">
            {report?.popupsTable.ok
              ? 'Scheduled announcement banners table accessible.'
              : report?.popupsTable.error || 'Awaiting Supabase configuration.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-[#EDE2D2] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7662] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Media Bucket</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                !report?.configured
                  ? 'text-[#8C7662]'
                  : report.storageBucket.ok
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {!report?.configured
                ? 'Pending'
                : report.storageBucket.ok
                ? 'Ready'
                : 'Error'}
            </span>
          </div>
          <p className="text-[11px] text-[#6B5746]">
            {report?.storageBucket.ok
              ? 'Public menu-media bucket ready for dish & logo uploads.'
              : report?.storageBucket.error || 'Awaiting Supabase configuration.'}
          </p>
        </div>
      </div>

      {/* Step-by-Step Guide After Connecting Supabase */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EDE2D2] space-y-3">
        <h3 className="font-serif text-base font-bold text-[#2C1C12]">
          What To Do After Connecting Supabase
        </h3>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#5C4533]">
          <li className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EFE5D6] space-y-1">
            <span className="font-bold text-[#2C1C12] block">
              1. Copy Project URL &amp; Anon Public Key
            </span>
            <span>
              In Supabase Dashboard open <strong>Project Settings → Data API / API Keys</strong> and copy your Project URL and publishable/anon key.
            </span>
          </li>
          <li className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EFE5D6] space-y-1">
            <span className="font-bold text-[#2C1C12] block">
              2. Add Environment Variables &amp; Redeploy
            </span>
            <span>
              Save <code className="font-mono text-[#B45309]">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-[#B45309]">VITE_SUPABASE_ANON_KEY</code> in your hosting/app environment settings, then restart or redeploy so the client bundle loads them.
            </span>
          </li>
          <li className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EFE5D6] space-y-1">
            <span className="font-bold text-[#2C1C12] block">
              3. Run the SQL Setup Query Once
            </span>
            <span>
              Open <strong>SQL Editor → New query</strong> in Supabase, paste the SQL script below, and click <strong>Run</strong>. It creates tables, RLS policies, Realtime replication, and the media storage bucket in one step.
            </span>
          </li>
          <li className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EFE5D6] space-y-1">
            <span className="font-bold text-[#2C1C12] block">
              4. Push Initial Menu &amp; Test Live Phone Sync
            </span>
            <span>
              Tap <strong>Push Menu to Cloud</strong> above once, open the Customer menu on a phone, then toggle any dish Sold Out here — it updates on the customer phone within a second.
            </span>
          </li>
        </ol>
      </div>

      {/* One-Click Copyable SQL Setup Script */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EDE2D2] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2C1C12]">
              Supabase SQL Setup Script
            </h3>
            <p className="text-[11px] text-[#7A6452]">
              Idempotent script — safe to re-run in Supabase SQL Editor anytime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullSql((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] font-semibold text-xs cursor-pointer"
            >
              {showFullSql ? 'Hide SQL' : 'Preview SQL'}
            </button>
            <button
              type="button"
              onClick={() => void handleCopySql()}
              className="px-3.5 py-1.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied SQL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showFullSql && (
          <pre className="max-h-80 overflow-auto p-3.5 rounded-xl bg-[#24160E] text-[#F9EEDB] text-[11px] leading-relaxed font-mono border border-[#3B2519]">
            {SUPABASE_SETUP_SQL}
          </pre>
        )}
      </div>
    </div>
  );
};
