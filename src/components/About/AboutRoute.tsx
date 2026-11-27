import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Save,
  Unlock,
} from 'lucide-react';
import { AboutFields } from '../../types/spotify';
import { useTheme } from '../../context/ThemeContext';
import { apiUrl } from '../../config/api';
import {
  saveAboutFieldsLocal,
  shouldPreferServerBackend,
  verifyAboutPasscodeLocal,
} from '../../services/catalogClient';

interface AboutRouteProps {
  onBack: () => void;
}

const ABOUT_STORAGE_KEY = 'spotify_about_fields';

const HARDCODED_DEVELOPER_NAME = 'AJAY - BATMAN';
const HARDCODED_GITHUB_URL = 'https://github.com/Ajay-batman/ByteMusic';

const DEFAULT_FIELDS: AboutFields = {
  appName: 'ByteMusic',
  version: '1.0.0',
  description:
    'Spatial audio & dynamic discovery player powered by live regional charts, week-locked mixes, and personalized taste profiles.',
  developerName: HARDCODED_DEVELOPER_NAME,
};

function loadCachedFields(): AboutFields {
  try {
    const raw = localStorage.getItem(ABOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        appName: typeof parsed.appName === 'string' ? parsed.appName : DEFAULT_FIELDS.appName,
        version: typeof parsed.version === 'string' ? parsed.version : DEFAULT_FIELDS.version,
        description:
          typeof parsed.description === 'string' ? parsed.description : DEFAULT_FIELDS.description,
        developerName: HARDCODED_DEVELOPER_NAME,
      };
    }
  } catch {}
  return { ...DEFAULT_FIELDS };
}

const ButterflyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 19V7" />
    <path d="M12 7c-1.2-2-3.5-3.2-6-3-2 .2-3.5 1.8-3.3 4 .2 2.4 2.3 4.3 5 4.8C5.4 13.7 4 15.6 4.5 17.7c.5 1.8 2.4 2.7 4.4 2 1.4-.5 2.4-1.7 3.1-3.2" />
    <path d="M12 7c1.2-2 3.5-3.2 6-3 2 .2 3.5 1.8 3.3 4-.2 2.4-2.3 4.3-5 4.8 2.3.9 3.7 2.8 3.2 4.9-.5 1.8-2.4 2.7-4.4 2-1.4-.5-2.4-1.7-3.1-3.2" />
    <path d="M10.5 4.5 9 3" />
    <path d="M13.5 4.5 15 3" />
  </svg>
);

export const AboutRoute: React.FC<AboutRouteProps> = ({ onBack }) => {
  const { isFrost, isAurora, isSunset, isVelvetLime, isLiquidGlass, isUltraviolet, isVelvetStyle } =
    useTheme();
  const isSpatialGlass = isVelvetStyle || isLiquidGlass || isUltraviolet;

  const [fields, setFields] = useState<AboutFields>(loadCachedFields);
  const [draftFields, setDraftFields] = useState<AboutFields>(loadCachedFields);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Dual passcode states — never persisted; automatically reset on unmount / close
  const [isViewUnlocked, setIsViewUnlocked] = useState<boolean>(false);
  const [isEditUnlocked, setIsEditUnlocked] = useState<boolean>(false);
  const [showEditGate, setShowEditGate] = useState<boolean>(false);
  const [viewPasscodeInput, setViewPasscodeInput] = useState<string>('');
  const [editPasscodeInput, setEditPasscodeInput] = useState<string>('');
  const [verifiedEditPasscode, setVerifiedEditPasscode] = useState<string>('');
  const [isVerifyingView, setIsVerifyingView] = useState<boolean>(false);
  const [isVerifyingEdit, setIsVerifyingEdit] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const lockAll = () => {
    setIsViewUnlocked(false);
    setIsEditUnlocked(false);
    setShowEditGate(false);
    setViewPasscodeInput('');
    setEditPasscodeInput('');
    setVerifiedEditPasscode('');
    setViewError(null);
    setEditError(null);
    setSaveBanner(null);
  };

  // Auto re-lock whenever the About page unmounts or user navigates away
  useEffect(() => {
    return () => {
      setIsViewUnlocked(false);
      setIsEditUnlocked(false);
      setShowEditGate(false);
      setViewPasscodeInput('');
      setEditPasscodeInput('');
      setVerifiedEditPasscode('');
    };
  }, []);

  // Load persisted fields from server if backend enabled; otherwise localStorage-only (Android serverless)
  useEffect(() => {
    if (!shouldPreferServerBackend()) {
      try {
        const ts = localStorage.getItem('spotify_about_updated_at');
        if (ts) setUpdatedAt(ts);
      } catch {}
      setIsLoadingInitial(false);
      return;
    }

    let active = true;
    fetch(apiUrl('/api/about'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.fields) {
          setIsLoadingInitial(false);
          return;
        }
        const loaded: AboutFields = {
          appName: typeof data.fields.appName === 'string' ? data.fields.appName : DEFAULT_FIELDS.appName,
          version: typeof data.fields.version === 'string' ? data.fields.version : DEFAULT_FIELDS.version,
          description:
            typeof data.fields.description === 'string'
              ? data.fields.description
              : DEFAULT_FIELDS.description,
          developerName: typeof data.fields.developerName === 'string' ? data.fields.developerName : '',
        };
        setFields(loaded);
        setDraftFields(loaded);
        setUpdatedAt(data.updatedAt || null);
        saveAboutFieldsLocal(loaded);
        setIsLoadingInitial(false);
      })
      .catch(() => {
        if (active) setIsLoadingInitial(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUnlockView = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = viewPasscodeInput.trim();
    if (!code) {
      setViewError('Please enter the 5-digit view passcode.');
      return;
    }

    setIsVerifyingView(true);
    setViewError(null);
    let verified = false;
    if (shouldPreferServerBackend()) {
      try {
        const res = await fetch(apiUrl('/api/about/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view', passcode: code }),
        });
        if (res.ok) {
          const data = await res.json();
          verified = Boolean(data?.ok);
        } else {
          verified = verifyAboutPasscodeLocal('view', code);
        }
      } catch {
        verified = verifyAboutPasscodeLocal('view', code);
      }
    } else {
      verified = verifyAboutPasscodeLocal('view', code);
    }

    if (verified) {
      setIsViewUnlocked(true);
      setDraftFields(fields);
      setViewPasscodeInput('');
      setViewError(null);
    } else {
      setViewError('Incorrect view passcode.');
    }
    setIsVerifyingView(false);
  };

  const handleUnlockEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isViewUnlocked) return;
    const code = editPasscodeInput.trim();
    if (!code) {
      setEditError('Please enter the edit passcode.');
      return;
    }

    setIsVerifyingEdit(true);
    setEditError(null);
    setSaveBanner(null);
    let verified = false;
    if (shouldPreferServerBackend()) {
      try {
        const res = await fetch(apiUrl('/api/about/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', passcode: code }),
        });
        if (res.ok) {
          const data = await res.json();
          verified = Boolean(data?.ok);
        } else {
          verified = verifyAboutPasscodeLocal('edit', code);
        }
      } catch {
        verified = verifyAboutPasscodeLocal('edit', code);
      }
    } else {
      verified = verifyAboutPasscodeLocal('edit', code);
    }

    if (verified) {
      setVerifiedEditPasscode(code);
      setDraftFields(fields);
      setIsEditUnlocked(true);
      setShowEditGate(false);
      setEditPasscodeInput('');
      setEditError(null);
    } else {
      setEditError('Incorrect edit passcode.');
    }
    setIsVerifyingEdit(false);
  };

  const handleSaveFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isViewUnlocked || !isEditUnlocked || !verifiedEditPasscode) return;

    setIsSaving(true);
    setEditError(null);
    setSaveBanner(null);

    let savedFields: AboutFields = draftFields;
    let savedAt = new Date().toISOString();

    if (shouldPreferServerBackend()) {
      try {
        const res = await fetch(apiUrl('/api/about'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passcode: verifiedEditPasscode,
            fields: draftFields,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setEditError(data?.error || 'Failed to save changes.');
          setIsSaving(false);
          return;
        }
        savedFields = data.fields || draftFields;
        savedAt = data.updatedAt || savedAt;
      } catch {
        // Offline / server down: fall back cleanly to on-device persistence
      }
    }

    setFields(savedFields);
    setDraftFields(savedFields);
    setUpdatedAt(savedAt);
    saveAboutFieldsLocal(savedFields);
    setSaveBanner('Saved and persisted across restarts.');
    setIsSaving(false);
  };

  const handleBack = () => {
    lockAll();
    onBack();
  };

  const accentBtnClass = isFrost
    ? 'bg-slate-900 text-white hover:bg-slate-800'
    : isAurora
    ? 'bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300'
    : isSunset
    ? 'bg-rose-500 text-white font-bold hover:bg-rose-400'
    : isVelvetLime
    ? 'bg-[#D2F843] text-black font-bold hover:bg-[#c2e833]'
    : 'bg-[#1db954] text-black font-bold hover:bg-[#1ed760]';

  const cardSurfaceStyle: React.CSSProperties | undefined = isSpatialGlass
    ? {
        backdropFilter: 'blur(20px) saturate(185%)',
        WebkitBackdropFilter: 'blur(20px) saturate(185%)',
        boxShadow: isFrost
          ? 'inset 0 1.5px 1.5px rgba(255,255,255,0.95), 0 18px 40px -10px rgba(15,23,42,0.1)'
          : 'inset 0 1.5px 1.5px rgba(255,255,255,0.45), inset 0 -1.5px 2px rgba(255,255,255,0.12), 0 22px 48px -12px rgba(0,0,0,0.52)',
      }
    : undefined;

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-all ${
    isFrost
      ? 'bg-white/85 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
      : 'bg-black/35 border-white/20 text-white placeholder-white/40 focus:border-white/55'
  }`;

  const readOnlyBoxClass = `w-full px-3.5 py-2.5 rounded-xl text-sm border ${
    isFrost
      ? 'bg-slate-100/80 border-slate-200 text-slate-900'
      : 'bg-white/[0.04] border-white/15 text-white'
  }`;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto pb-32 md:pb-10 select-none scrollbar-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            style={
              isSpatialGlass
                ? {
                    backdropFilter: 'blur(16px) saturate(185%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(185%)',
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
              isFrost
                ? 'text-slate-900 bg-white/80 hover:bg-white border-slate-300/80 shadow-sm'
                : isSpatialGlass
                ? 'text-white bg-white/[0.08] hover:bg-white/[0.16] border-white/25'
                : 'text-white/85 hover:text-white bg-[#282828] border-[#3e3e3e]'
            }`}
          >
            <ArrowLeft size={15} />
            <span>Back to Settings</span>
          </button>

          {isViewUnlocked && (
            <button
              type="button"
              onClick={lockAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isFrost
                  ? 'bg-white/85 border-slate-300 text-slate-800 hover:bg-white'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <Lock size={13} />
              <span>Re-lock Fields</span>
            </button>
          )}
        </div>

        {/* Compact About Header */}
        <section
          style={cardSurfaceStyle}
          className={`rounded-[24px] border p-5 sm:p-6 ${
            isFrost
              ? 'bg-white/75 border-slate-200/90 text-slate-900'
              : isSpatialGlass
              ? 'bg-white/[0.06] border-white/20 text-white'
              : 'bg-[#181818] border-[#2c2c2c] text-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                isFrost
                  ? 'bg-sky-500/15 text-sky-700 border border-sky-400/30'
                  : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-white'
              }`}
            >
              <Info size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                About
              </h1>
              <p className={`text-xs mt-1 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
                Enter the view passcode to inspect application details.
              </p>
            </div>
          </div>
        </section>

        {/* Information Fields Section */}
        <section
          style={cardSurfaceStyle}
          className={`relative rounded-[24px] border p-5 sm:p-6 space-y-5 ${
            isFrost
              ? 'bg-white/75 border-slate-200/90 text-slate-900'
              : isSpatialGlass
              ? 'bg-white/[0.06] border-white/20 text-white'
              : 'bg-[#181818] border-[#2c2c2c] text-white'
          }`}
        >
          {/* Section Status Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-current/10">
            <div className="flex items-center gap-2.5">
              {isEditUnlocked ? (
                <Edit3 size={18} className="text-amber-400" />
              ) : isViewUnlocked ? (
                <Eye size={18} className={isFrost ? 'text-sky-600' : 'text-emerald-400'} />
              ) : (
                <Lock size={18} className={isFrost ? 'text-slate-500' : 'text-white/60'} />
              )}
              <div>
                <h2 className="text-base font-bold">Application Information</h2>
                <p className={`text-xs ${isFrost ? 'text-slate-500' : 'text-white/60'}`}>
                  {isEditUnlocked
                    ? 'Edit mode active'
                    : isViewUnlocked
                    ? 'View unlocked'
                    : 'Locked — view passcode required'}
                </p>
              </div>
            </div>

            {updatedAt && isViewUnlocked && (
              <span className={`text-[11px] font-medium ${isFrost ? 'text-slate-500' : 'text-white/50'}`}>
                Updated {new Date(updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {isLoadingInitial ? (
            <div className="flex items-center gap-2 py-8 justify-center text-xs opacity-70">
              <Loader2 size={16} className="animate-spin" />
              <span>Loading...</span>
            </div>
          ) : !isViewUnlocked ? (
            /* STAGE 1: LOCKED — View Passcode Gate (5 chars max, fields hidden) */
            <form onSubmit={handleUnlockView} className="space-y-3 max-w-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                    View Passcode
                  </label>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border tracking-widest ${
                      isFrost
                        ? 'bg-slate-200/80 border-slate-300 text-slate-900'
                        : 'bg-white/10 border-white/20 text-white'
                    }`}
                  >
                    00000
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound
                      size={15}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isFrost ? 'text-slate-400' : 'text-white/45'
                      }`}
                    />
                    <input
                      type="password"
                      maxLength={5}
                      value={viewPasscodeInput}
                      onChange={(e) => {
                        setViewPasscodeInput(e.target.value.slice(0, 5));
                        setViewError(null);
                      }}
                      placeholder="5-digit passcode"
                      autoComplete="off"
                      className={`${inputClass} pl-10 tracking-widest`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifyingView}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${accentBtnClass}`}
                  >
                    {isVerifyingView ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                    <span>Unlock</span>
                  </button>
                </div>
                {viewError && <p className="text-xs font-medium text-rose-400">{viewError}</p>}
              </div>
            </form>
          ) : (
            /* STAGE 2 & 3: VIEW UNLOCKED (Read-Only) or EDIT UNLOCKED */
            <form onSubmit={handleSaveFields} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: App Name */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                    App Name
                  </label>
                  {isEditUnlocked ? (
                    <input
                      type="text"
                      value={draftFields.appName}
                      onChange={(e) => {
                        setDraftFields((prev) => ({ ...prev, appName: e.target.value }));
                        setSaveBanner(null);
                      }}
                      placeholder="Application name"
                      className={inputClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {fields.appName || <span className="opacity-45 italic">Empty</span>}
                    </div>
                  )}
                </div>

                {/* Field 2: Version */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                    Version
                  </label>
                  {isEditUnlocked ? (
                    <input
                      type="text"
                      value={draftFields.version}
                      onChange={(e) => {
                        setDraftFields((prev) => ({ ...prev, version: e.target.value }));
                        setSaveBanner(null);
                      }}
                      placeholder="1.0.0"
                      className={inputClass}
                    />
                  ) : (
                    <div className={readOnlyBoxClass}>
                      {fields.version || <span className="opacity-45 italic">Empty</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Description */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                  Description
                </label>
                {isEditUnlocked ? (
                  <textarea
                    rows={3}
                    value={draftFields.description}
                    onChange={(e) => {
                      setDraftFields((prev) => ({ ...prev, description: e.target.value }));
                      setSaveBanner(null);
                    }}
                    placeholder="Application description"
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <div className={`${readOnlyBoxClass} whitespace-pre-wrap leading-relaxed`}>
                    {fields.description || <span className="opacity-45 italic">Empty</span>}
                  </div>
                )}
              </div>

              {/* Field 4 & 5: Hardcoded Developer & GitHub Repository (Protected Section) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                    Developer
                  </label>
                  <div className={`${readOnlyBoxClass} font-bold tracking-wide`}>
                    {HARDCODED_DEVELOPER_NAME}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                    GitHub Repository
                  </label>
                  <a
                    href={HARDCODED_GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${readOnlyBoxClass} block truncate underline underline-offset-2 transition-colors ${
                      isFrost
                        ? 'text-sky-700 hover:text-sky-900'
                        : isVelvetLime
                        ? 'text-[#D2F843] hover:text-white'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    Ajay-batman/ByteMusic
                  </a>
                </div>
              </div>

              {saveBanner && (
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    isFrost
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                      : 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300'
                  }`}
                >
                  <Check size={15} />
                  <span>{saveBanner}</span>
                </div>
              )}

              {isEditUnlocked && (
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFields(fields);
                      setIsEditUnlocked(false);
                      setVerifiedEditPasscode('');
                      setEditError(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      isFrost
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    Lock Editing
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${accentBtnClass}`}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Hidden Edit Gate + Small Bottom-Right Butterfly Circle Trigger (only after View Unlock) */}
          {isViewUnlocked && !isEditUnlocked && (
            <div className="flex flex-col items-end gap-3 pt-1">
              {showEditGate && (
                <form
                  onSubmit={handleUnlockEdit}
                  className={`w-full max-w-sm p-3.5 rounded-2xl border space-y-2.5 ${
                    isFrost
                      ? 'bg-white/95 border-slate-300 shadow-lg'
                      : 'bg-black/50 border-white/20 backdrop-blur-xl shadow-2xl'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound
                        size={14}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                          isFrost ? 'text-slate-400' : 'text-white/45'
                        }`}
                      />
                      <input
                        type="password"
                        value={editPasscodeInput}
                        onChange={(e) => {
                          setEditPasscodeInput(e.target.value);
                          setEditError(null);
                        }}
                        placeholder="Passcode"
                        autoComplete="off"
                        autoFocus
                        className={`${inputClass} pl-9 py-2 text-xs`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifyingEdit}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 ${accentBtnClass}`}
                    >
                      {isVerifyingEdit ? <Loader2 size={13} className="animate-spin" /> : <Edit3 size={13} />}
                      <span>Unlock</span>
                    </button>
                  </div>
                  {editError && <p className="text-xs font-medium text-rose-400">{editError}</p>}
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowEditGate((prev) => !prev);
                  setEditError(null);
                }}
                aria-label="Edit mode"
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isFrost
                    ? 'bg-white/85 border-slate-300 text-slate-700 hover:bg-white shadow-sm'
                    : 'bg-white/10 border-white/20 text-white/80 hover:text-white hover:bg-white/20 shadow-md'
                }`}
              >
                <ButterflyIcon size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
