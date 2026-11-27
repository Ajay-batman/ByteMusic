import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  Download,
  Film,
  Loader2,
  Music2,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../../context/ThemeContext';
import {
  DownloadProgressEvent,
  fetchYouTubeVideoFormats,
  formatBytes,
  loadDownloadHistory,
  saveDownloadHistoryEntry,
  SavedDownloadEntry,
  startYouTubeDownload,
  VideoQualityOption,
  YouTubeVideoInfo,
} from '../../services/videoDownloader';

interface DownloaderRouteProps {
  onBack: () => void;
}

function formatVideoLength(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export const DownloaderRoute: React.FC<DownloaderRouteProps> = ({ onBack }) => {
  const { isFrost, isAurora, isSunset, isVelvetLime, isLiquidGlass, isUltraviolet, isVelvetStyle } =
    useTheme();
  const isSpatialGlass = isVelvetStyle || isLiquidGlass || isUltraviolet;
  const isAndroidNative = Capacitor.isNativePlatform();

  const [urlInput, setUrlInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [selectedOption, setSelectedOption] = useState<VideoQualityOption | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressState, setProgressState] = useState<DownloadProgressEvent | null>(null);
  const [history, setHistory] = useState<SavedDownloadEntry[]>(loadDownloadHistory);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg('Clipboard access unavailable — paste URL manually.');
    }
  };

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Paste a YouTube video link first.');
      return;
    }

    setIsFetching(true);
    setErrorMsg(null);
    setProgressState(null);
    setVideoInfo(null);
    setSelectedOption(null);

    try {
      const info = await fetchYouTubeVideoFormats(urlInput);
      setVideoInfo(info);
      setSelectedOption(info.options[0] || null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to inspect YouTube link.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedOption || isDownloading) return;
    setIsDownloading(true);
    setErrorMsg(null);
    setProgressState({
      stage: 'downloading',
      progress: 2,
      message: isAndroidNative ? 'Starting Android DownloadManager...' : 'Preparing download...',
    });

    try {
      const res = await startYouTubeDownload(videoInfo, selectedOption, (ev) => {
        setProgressState(ev);
      });
      const updated = saveDownloadHistoryEntry({
        id: `${videoInfo.videoId}-${selectedOption.quality}-${Date.now()}`,
        title: videoInfo.title,
        quality: selectedOption.quality,
        container: selectedOption.container,
        path: res.path,
        downloadedAt: new Date().toISOString(),
      });
      setHistory(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Download failed.');
      setProgressState(null);
    } finally {
      setIsDownloading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('bytemusic_video_downloads');
    } catch {}
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

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto pb-32 md:pb-10 select-none scrollbar-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
              isFrost
                ? 'text-slate-900 bg-white/80 hover:bg-white border-slate-300/80 shadow-sm'
                : isSpatialGlass
                ? 'text-white bg-white/[0.08] hover:bg-white/[0.16] border-white/25'
                : 'text-white/85 hover:text-white bg-[#282828] border-[#3e3e3e]'
            }`}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
              isFrost
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-900'
                : 'bg-white/10 border-white/20 text-white/80'
            }`}
          >
            {isAndroidNative ? 'Android DownloadManager + MediaMuxer' : 'YouTube Quality Downloader'}
          </span>
        </div>

        {/* Link Input Card */}
        <section
          style={cardSurfaceStyle}
          className={`rounded-[24px] border p-5 sm:p-6 space-y-4 ${
            isFrost
              ? 'bg-white/75 border-slate-200/90 text-slate-900'
              : isSpatialGlass
              ? 'bg-white/[0.06] border-white/20 text-white'
              : 'bg-[#181818] border-[#2c2c2c] text-white'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                isFrost
                  ? 'bg-sky-500/15 text-sky-700 border border-sky-400/30'
                  : 'bg-gradient-to-br from-rose-500 via-fuchsia-600 to-indigo-600 text-white'
              }`}
            >
              <Film size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                Video Downloader
              </h1>
              <p className={`text-xs mt-0.5 ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
                Paste a YouTube link to download MP4 (1080p, 720p, 360p) or M4A audio.
              </p>
            </div>
          </div>

          <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 flex items-center">
              <Search
                size={16}
                className={`absolute left-3.5 pointer-events-none ${
                  isFrost ? 'text-slate-400' : 'text-white/45'
                }`}
              />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                className={`w-full pl-10 pr-20 py-3 rounded-xl text-sm border outline-none transition-all ${
                  isFrost
                    ? 'bg-white/90 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                    : 'bg-black/35 border-white/20 text-white placeholder-white/40 focus:border-white/55'
                }`}
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste link from clipboard"
                className={`absolute right-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  isFrost
                    ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
                    : 'bg-white/10 hover:bg-white/20 text-white/85'
                }`}
              >
                <ClipboardPaste size={12} />
                <span>Paste</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isFetching || isDownloading}
              className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${accentBtnClass}`}
            >
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span>{isFetching ? 'Checking...' : 'Get Qualities'}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl text-xs font-medium bg-rose-500/15 border border-rose-400/30 text-rose-400">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Format Selection & Progress Card */}
        {videoInfo && (
          <section
            style={cardSurfaceStyle}
            className={`rounded-[24px] border p-5 sm:p-6 space-y-5 ${
              isFrost
                ? 'bg-white/75 border-slate-200/90 text-slate-900'
                : isSpatialGlass
                ? 'bg-white/[0.06] border-white/20 text-white'
                : 'bg-[#181818] border-[#2c2c2c] text-white'
            }`}
          >
            {/* Preview Info */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-full sm:w-44 aspect-video rounded-2xl object-cover shadow-lg border border-white/20 flex-shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">
                  {videoInfo.title}
                </h2>
                <p className={`text-xs font-medium ${isFrost ? 'text-slate-600' : 'text-white/65'}`}>
                  {videoInfo.author}
                  {videoInfo.durationSeconds > 0 && ` • ${formatVideoLength(videoInfo.durationSeconds)}`}
                </p>
              </div>
            </div>

            {/* Quality Chooser Grid */}
            <div className="space-y-2.5">
              <label className={`text-xs font-semibold uppercase tracking-wider block ${isFrost ? 'text-slate-600' : 'text-white/70'}`}>
                Choose Quality
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {videoInfo.options.map((opt) => {
                  const selected = selectedOption?.id === opt.id;
                  const isAudio = opt.container === 'M4A';
                  const sizeStr = formatBytes(opt.sizeBytes);
                  const desktopMuxNote = !isAndroidNative && opt.muxAudio
                    ? videoInfo.muxerAvailable
                      ? 'With Audio (MP4)'
                      : 'Video Stream Only'
                    : 'With Audio';
                  const audioBadge = isAudio
                    ? 'Audio Track'
                    : opt.muxAudio && isAndroidNative
                    ? 'With Audio (MediaMuxer)'
                    : desktopMuxNote;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isDownloading}
                      onClick={() => setSelectedOption(opt)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 ${
                        selected
                          ? isFrost
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : isVelvetLime
                            ? 'bg-[#D2F843]/20 border-[#D2F843] text-white'
                            : 'bg-white/15 border-white/50 text-white shadow-md'
                          : isFrost
                          ? 'bg-white/70 border-slate-200 hover:bg-white text-slate-900'
                          : 'bg-white/[0.04] border-white/15 hover:bg-white/[0.1] text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isAudio ? <Music2 size={17} /> : <Film size={17} />}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{opt.label}</p>
                          <p
                            className={`text-[11px] truncate ${
                              selected && isFrost
                                ? 'text-white/75'
                                : isFrost
                                ? 'text-slate-600'
                                : 'text-white/60'
                            }`}
                          >
                            {opt.container} • {audioBadge}
                            {sizeStr ? ` • ${sizeStr}` : ''}
                          </p>
                        </div>
                      </div>
                      {selected && <CheckCircle2 size={16} className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            {progressState && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{progressState.message}</span>
                  <span>{progressState.progress}%</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isFrost ? 'bg-slate-200' : 'bg-white/15'}`}>
                  <div
                    className={`h-full transition-all duration-300 ${
                      progressState.stage === 'completed'
                        ? 'bg-emerald-500'
                        : isFrost
                        ? 'bg-sky-600'
                        : isVelvetLime
                        ? 'bg-[#D2F843]'
                        : 'bg-[#1db954]'
                    }`}
                    style={{ width: `${Math.max(3, Math.min(100, progressState.progress))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Action Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!selectedOption || isDownloading}
                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${accentBtnClass}`}
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>
                  {isDownloading
                    ? progressState?.stage === 'muxing'
                      ? 'Muxing Video & Audio...'
                      : 'Downloading...'
                    : `Download ${selectedOption?.quality || ''}`}
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Recent Downloads */}
        {history.length > 0 && (
          <section
            style={cardSurfaceStyle}
            className={`rounded-[24px] border p-5 sm:p-6 space-y-3 ${
              isFrost
                ? 'bg-white/75 border-slate-200/90 text-slate-900'
                : isSpatialGlass
                ? 'bg-white/[0.06] border-white/20 text-white'
                : 'bg-[#181818] border-[#2c2c2c] text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider opacity-75">
                Recent Downloads
              </h2>
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold opacity-65 hover:opacity-100 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            </div>

            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isFrost ? 'bg-white/80 border-slate-200' : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{item.title}</p>
                    <p className="opacity-65 truncate mt-0.5">{item.path}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${
                      isFrost ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'
                    }`}
                  >
                    {item.quality} {item.container}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
