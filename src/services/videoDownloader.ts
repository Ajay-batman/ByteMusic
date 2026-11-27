import { Capacitor, CapacitorHttp, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { apiUrl } from '../config/api';
import { shouldPreferServerBackend } from './catalogClient';

export interface VideoQualityOption {
  id: string;
  itag: number;
  label: string;
  quality: string;
  container: 'MP4' | 'M4A';
  hasAudio: boolean;
  muxAudio: boolean;
  videoUrl: string;
  audioUrl?: string;
  sizeBytes?: number;
  ticket?: string;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  durationSeconds: number;
  thumbnail: string;
  userAgent: string;
  muxerAvailable?: boolean;
  options: VideoQualityOption[];
}

export interface DownloadProgressEvent {
  stage: 'downloading' | 'muxing' | 'saving' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface SavedDownloadEntry {
  id: string;
  title: string;
  quality: string;
  container: string;
  path: string;
  downloadedAt: string;
}

interface NativeYouTubeDownloaderPlugin {
  downloadVideo(options: {
    videoUrl: string;
    audioUrl?: string;
    fileName: string;
    title: string;
    qualityLabel: string;
    userAgent: string;
    muxAudio: boolean;
  }): Promise<{ success: boolean; path: string; fileName: string; muxed: boolean }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: DownloadProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

const NativeYouTubeDownloader = registerPlugin<NativeYouTubeDownloaderPlugin>('YouTubeDownloader');

const ANDROID_VR_UA =
  'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip';
const VISIONOS_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const WEB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const DOWNLOAD_HISTORY_KEY = 'bytemusic_video_downloads';

export function extractYouTubeVideoId(rawInput: string): string | null {
  const input = rawInput.trim();
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(withScheme);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

    const parts = url.pathname.split('/').filter(Boolean);
    const markerIdx = parts.findIndex((p) => p === 'shorts' || p === 'embed' || p === 'live' || p === 'v');
    if (markerIdx >= 0 && parts[markerIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[markerIdx + 1])) {
      return parts[markerIdx + 1];
    }
  } catch {}
  return null;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStreamLengthBytes(f: any): number {
  const direct = Number(f?.contentLength || 0);
  if (direct > 0) return direct;
  try {
    return Number(new URL(f.url).searchParams.get('clen') || 0);
  } catch {
    return 0;
  }
}

function buildClientVideoInfo(videoId: string, data: any, ua: string): YouTubeVideoInfo | null {
  if (data?.playabilityStatus?.status !== 'OK') return null;

  const details = data.videoDetails || {};
  const sd = data.streamingData || {};
  const formats: any[] = Array.isArray(sd.formats) ? sd.formats : [];
  const adaptive: any[] = Array.isArray(sd.adaptiveFormats) ? sd.adaptiveFormats : [];

  const audioTrack =
    adaptive.find((f) => Number(f.itag) === 140 && f.url) ||
    adaptive.find((f) => (f.mimeType || '').includes('mp4a') && f.url) ||
    adaptive.find((f) => Number(f.itag) === 139 && f.url);

  const targets = [
    { height: 1080, itags: [137, 299], label: '1080p Full HD', quality: '1080p' },
    { height: 720, itags: [136, 298], label: '720p HD', quality: '720p' },
    { height: 480, itags: [135], label: '480p SD', quality: '480p' },
  ];

  const options: VideoQualityOption[] = [];
  for (const t of targets) {
    const match =
      adaptive.find((f) => t.itags.includes(Number(f.itag)) && f.url) ||
      adaptive.find(
        (f) =>
          (Number(f.height) === t.height || String(f.qualityLabel || '').startsWith(t.quality)) &&
          (f.mimeType || '').includes('avc1') &&
          f.url
      );

    if (match && match.url && audioTrack) {
      const totalBytes = getStreamLengthBytes(match) + getStreamLengthBytes(audioTrack);
      options.push({
        id: `hd-${match.itag}`,
        itag: match.itag,
        label: match.qualityLabel?.includes('60') ? `${t.label} 60fps` : t.label,
        quality: t.quality,
        container: 'MP4',
        hasAudio: true,
        muxAudio: true,
        videoUrl: match.url,
        audioUrl: audioTrack.url,
        sizeBytes: totalBytes || undefined,
      });
    }
  }

  const muxedList = formats.filter((f) => f.url);
  for (const mf of muxedList) {
    const q = mf.qualityLabel || '360p';
    if (options.some((o) => o.quality === q && !o.muxAudio)) continue;
    options.push({
      id: `muxed-${mf.itag}`,
      itag: mf.itag,
      label: `${q} Quick MP4`,
      quality: q,
      container: 'MP4',
      hasAudio: true,
      muxAudio: false,
      videoUrl: mf.url,
      sizeBytes: getStreamLengthBytes(mf) || undefined,
    });
  }

  if (audioTrack && audioTrack.url) {
    options.push({
      id: `audio-${audioTrack.itag}`,
      itag: audioTrack.itag,
      label: 'Audio Only (128kbps)',
      quality: 'Audio',
      container: 'M4A',
      hasAudio: true,
      muxAudio: false,
      videoUrl: audioTrack.url,
      sizeBytes: getStreamLengthBytes(audioTrack) || undefined,
    });
  }

  if (options.length === 0) return null;
  const thumbs = details?.thumbnail?.thumbnails || [];
  return {
    videoId,
    title: details.title || 'YouTube Video',
    author: details.author || 'YouTube Creator',
    durationSeconds: Number(details.lengthSeconds) || 0,
    thumbnail: thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    userAgent: ua,
    options,
  };
}

export async function fetchYouTubeVideoFormats(rawUrl: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error('Please paste a valid YouTube video or Shorts URL.');
  }

  if (shouldPreferServerBackend()) {
    const res = await fetch(apiUrl(`/api/yt-formats?id=${encodeURIComponent(videoId)}`));
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Could not load video formats.');
    }
    return data as YouTubeVideoInfo;
  }

  let lastReason = '';

  // 1. Serverless Android Primary: VISIONOS with page VISITOR_DATA (avoids LOGIN_REQUIRED and 12MB 403 cutoff)
  try {
    const pageRes = await CapacitorHttp.get({
      url: `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`,
      headers: {
        'User-Agent': WEB_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = typeof pageRes.data === 'string' ? pageRes.data : '';
    const vMatch = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/) || html.match(/"visitorData"\s*:\s*"([^"]+)"/);
    const kMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    const visitorData = vMatch?.[1] || '';
    const apiKey = kMatch?.[1] || '';

    const playerRes = await CapacitorHttp.post({
      url: `https://www.youtube.com/youtubei/v1/player?prettyPrint=false${apiKey ? `&key=${apiKey}` : ''}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': VISIONOS_UA,
        Origin: 'https://www.youtube.com',
        'X-Youtube-Client-Name': '101',
        'X-Youtube-Client-Version': '1.02',
        ...(visitorData ? { 'X-Goog-Visitor-Id': visitorData } : {}),
      },
      data: {
        context: {
          client: {
            clientName: 'VISIONOS',
            clientVersion: '1.02',
            deviceMake: 'Apple',
            deviceModel: 'RealityDevice17,1',
            osName: 'visionOS',
            osVersion: '26.5.23O471',
            hl: 'en',
            gl: 'US',
            ...(visitorData ? { visitorData } : {}),
          },
        },
        videoId,
        playbackContext: { contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' } },
        racyCheckOk: true,
        contentCheckOk: true,
      },
    });
    const visionData = typeof playerRes.data === 'string' ? JSON.parse(playerRes.data) : playerRes.data;
    const visionInfo = buildClientVideoInfo(videoId, visionData, VISIONOS_UA);
    if (visionInfo) return visionInfo;
    lastReason = visionData?.playabilityStatus?.reason || lastReason;
  } catch {}

  // 2. Native Android Fallback via CapacitorHttp (ANDROID_VR -> IOS)
  const ytClients = [
    {
      ua: ANDROID_VR_UA,
      ctx: {
        clientName: 'ANDROID_VR',
        clientVersion: '1.60.19',
        deviceMake: 'Oculus',
        deviceModel: 'Quest 3',
        osName: 'Android',
        osVersion: '12L',
        androidSdkVersion: 32,
        hl: 'en',
        gl: 'US',
      },
    },
    {
      ua: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
      ctx: {
        clientName: 'IOS',
        clientVersion: '20.10.4',
        deviceMake: 'Apple',
        deviceModel: 'iPhone16,2',
        osName: 'iPhone',
        osVersion: '18.3.2.22D82',
        hl: 'en',
        gl: 'US',
      },
    },
  ];

  for (const client of ytClients) {
    const playerRes = await CapacitorHttp.post({
      url: 'https://www.youtube.com/youtubei/v1/player',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': client.ua,
      },
      data: {
        context: { client: client.ctx },
        videoId,
      },
    });

    const data = typeof playerRes.data === 'string' ? JSON.parse(playerRes.data) : playerRes.data;
    const info = buildClientVideoInfo(videoId, data, client.ua);
    if (info) return info;
    lastReason = data?.playabilityStatus?.reason || lastReason;
  }

  throw new Error(lastReason || 'No downloadable MP4/M4A streams available for this video.');
}

export async function startYouTubeDownload(
  info: YouTubeVideoInfo,
  option: VideoQualityOption,
  onProgress: (ev: DownloadProgressEvent) => void
): Promise<{ path: string; fileName: string }> {
  const safeBase = info.title.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 70) || 'ByteMusic_Video';
  const ext = option.container.toLowerCase();
  const fileName = `${safeBase}_${option.quality}.${ext}`;

  if (Capacitor.isNativePlatform()) {
    const listener = await NativeYouTubeDownloader.addListener('downloadProgress', onProgress);
    try {
      const res = await NativeYouTubeDownloader.downloadVideo({
        videoUrl: option.videoUrl,
        audioUrl: option.audioUrl,
        fileName,
        title: info.title,
        qualityLabel: option.quality,
        userAgent: info.userAgent || ANDROID_VR_UA,
        muxAudio: option.muxAudio,
      });
      return { path: res.path, fileName: res.fileName };
    } finally {
      await listener.remove();
    }
  }

  // Desktop Browser two-phase download: prepare & mux on server with live progress, then trigger instant disk download
  if (!option.ticket) {
    throw new Error('Missing download ticket — click Get Qualities again.');
  }

  onProgress({ stage: 'downloading', progress: 3, message: `Starting ${option.quality} download...` });
  const prepRes = await fetch(apiUrl(`/api/yt-prepare-download?ticket=${encodeURIComponent(option.ticket)}`), {
    method: 'POST',
  });
  if (!prepRes.ok) {
    const errJson = await prepRes.json().catch(() => ({}));
    throw new Error(errJson?.error || 'Could not start desktop download.');
  }

  // Poll job status until file is downloaded & muxed cleanly
  while (true) {
    await new Promise((r) => setTimeout(r, 400));
    const stRes = await fetch(apiUrl(`/api/yt-download-status?ticket=${encodeURIComponent(option.ticket)}`));
    const st = await stRes.json();
    if (!stRes.ok || st.status === 'error') {
      throw new Error(st?.error || 'Download failed.');
    }

    if (st.status === 'ready') {
      onProgress({ stage: 'completed', progress: 100, message: `Saved: ${fileName}` });
      const fileUrl = apiUrl(
        `/api/yt-download-file?ticket=${encodeURIComponent(option.ticket)}&filename=${encodeURIComponent(fileName)}`
      );
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { path: `Browser Downloads/${fileName}`, fileName };
    }

    onProgress({
      stage: st.status === 'muxing' ? 'muxing' : 'downloading',
      progress: Number(st.progress) || 10,
      message: st.message || 'Processing...',
    });
  }
}

export function loadDownloadHistory(): SavedDownloadEntry[] {
  try {
    const raw = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SavedDownloadEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveDownloadHistoryEntry(entry: SavedDownloadEntry): SavedDownloadEntry[] {
  const next = [entry, ...loadDownloadHistory().filter((item) => item.id !== entry.id)].slice(0, 15);
  try {
    localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
