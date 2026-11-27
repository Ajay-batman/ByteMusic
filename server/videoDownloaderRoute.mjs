/**
 * Standalone YouTube Downloader Route Handler (/api/yt-formats, /api/yt-prepare-download, /api/yt-download-status, /api/yt-download-file, /api/yt-video-download)
 * Shared by Vite Dev Middleware (vite.config.ts) and Production Server (server.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DL_DIR = path.resolve(__dirname, '../data/.tmp-dl');

const VISIONOS_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';

const ytDownloadTickets = new Map();
const ytJobs = new Map(); // ticket -> { status, progress, message, outPath, size, contentType, error, createdAt, cleanupTimer }
let cachedFfmpegPath;

function scheduleJobCleanup(ticketId, outPath, delayMs = 10 * 60 * 1000) {
  const job = ytJobs.get(ticketId);
  if (job?.cleanupTimer) {
    clearTimeout(job.cleanupTimer);
  }
  const timer = setTimeout(() => {
    safeUnlink(outPath);
    ytJobs.delete(ticketId);
  }, delayMs);
  if (typeof timer.unref === 'function') timer.unref();
  if (job) job.cleanupTimer = timer;
}

const YT_CLIENTS = [
  {
    ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
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

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DL_DIR)) {
    fs.mkdirSync(TEMP_DL_DIR, { recursive: true });
  }
  // Sweep orphaned temp files older than 30 minutes
  try {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const file of fs.readdirSync(TEMP_DL_DIR)) {
      const full = path.join(TEMP_DL_DIR, file);
      try {
        if (fs.statSync(full).mtimeMs < cutoff) {
          fs.unlinkSync(full);
        }
      } catch {}
    }
  } catch {}
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function resolveFfmpegPath() {
  if (cachedFfmpegPath !== undefined) return cachedFfmpegPath;
  const candidates = ['D:\\ffmpeg\\bin\\ffmpeg.exe', 'ffmpeg'];
  for (const bin of candidates) {
    try {
      if (bin.includes('\\') && !fs.existsSync(bin)) continue;
      execFileSync(bin, ['-version'], { stdio: 'ignore' });
      cachedFfmpegPath = bin;
      return cachedFfmpegPath;
    } catch {}
  }
  cachedFfmpegPath = null;
  return null;
}

async function downloadStreamToFile(streamUrl, ua, destPath, onBytes) {
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB Range chunks avoid googlevideo single-GET throttling
  let urlLen = 0;
  try {
    urlLen = Number(new URL(streamUrl).searchParams.get('clen') || 0);
  } catch {}

  const ws = fs.createWriteStream(destPath);
  let received = 0;
  let total = urlLen;

  try {
    if (total > 0) {
      let start = 0;
      while (start < total) {
        const end = Math.min(total - 1, start + CHUNK_SIZE - 1);
        let res = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            res = await fetch(streamUrl, {
              headers: { 'User-Agent': ua, Range: `bytes=${start}-${end}` },
              signal: AbortSignal.timeout(45000),
            });
            if (res.ok && res.body) break;
          } catch (err) {
            if (attempt === 1) throw err;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!res || !res.ok || !res.body) {
          throw new Error(`Upstream chunk HTTP ${res?.status || 'network'}`);
        }
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (!ws.write(value)) {
            await new Promise((r) => ws.once('drain', r));
          }
          onBytes?.(received, total);
        }
        start = end + 1;
      }
      return received;
    }

    // Fallback when clen is absent
    const res = await fetch(streamUrl, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }
    total = Number(res.headers.get('content-length') || 0);
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (!ws.write(value)) {
        await new Promise((r) => ws.once('drain', r));
      }
      onBytes?.(received, total);
    }
  } finally {
    await new Promise((resolve) => ws.end(resolve));
  }
  return received;
}

function runFfmpegLocalMux({
  ffmpegPath,
  videoPath,
  audioPath,
  outPath,
  transcodeVideo,
  transcodeAudio,
}) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      transcodeVideo ? 'libx264' : 'copy',
      ...(transcodeVideo ? ['-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p'] : []),
      '-c:a',
      transcodeAudio ? 'aac' : 'copy',
      ...(transcodeAudio ? ['-ac', '2', '-b:a', '192k'] : []),
      '-movflags',
      '+faststart',
      outPath,
    ];
    execFile(ffmpegPath, args, { timeout: 240000 }, (err, _stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || err.message || 'FFmpeg mux failed'));
      } else {
        resolve();
      }
    });
  });
}

function registerTicket(entry) {
  const ticket = crypto.randomUUID();
  if (ytDownloadTickets.size > 60) {
    const oldest = ytDownloadTickets.keys().next().value;
    if (oldest) ytDownloadTickets.delete(oldest);
  }
  ytDownloadTickets.set(ticket, { ...entry, expiresAt: Date.now() + 30 * 60 * 1000 });
  return ticket;
}

function formatContentLength(format) {
  if (!format) return 0;
  const direct = Number(format.contentLength || 0);
  if (direct > 0) return direct;
  try {
    return Number(new URL(format.url).searchParams.get('clen') || 0);
  } catch {
    return 0;
  }
}

function buildOptionsFromRaw(videoId, formats = [], adaptive = [], clientUa = YT_CLIENTS[0].ua, ffmpegPath = null) {
  // Strictly prefer stereo AAC (mp4a / itag 140) over surround EC-3/AC-3 so every player gets sound
  const mp4aAudio =
    adaptive.find((f) => Number(f.itag) === 140 && f.url) ||
    adaptive.find((f) => (f.mimeType || '').includes('mp4a') && f.url) ||
    adaptive.find((f) => Number(f.itag) === 139 && f.url);
  const anyAudio = mp4aAudio || adaptive.find((f) => (f.mimeType || '').includes('audio/') && f.url);
  const audioTrack = ffmpegPath ? mp4aAudio || anyAudio : mp4aAudio;
  const needsAudioTranscode = Boolean(audioTrack && !(audioTrack.mimeType || '').includes('mp4a'));

  const targets = [
    { height: 1080, itags: [137, 299], label: '1080p Full HD', quality: '1080p' },
    { height: 720, itags: [136, 298], label: '720p HD', quality: '720p' },
    { height: 480, itags: [135], label: '480p SD', quality: '480p' },
  ];

  const opts = [];
  for (const t of targets) {
    const avcMatch =
      adaptive.find((f) => t.itags.includes(Number(f.itag)) && f.url) ||
      adaptive.find(
        (f) =>
          (Number(f.height) === t.height || String(f.qualityLabel || '').startsWith(t.quality)) &&
          (f.mimeType || '').includes('avc1') &&
          f.url
      );
    const fallbackMatch =
      !avcMatch && ffmpegPath
        ? adaptive.find(
            (f) =>
              (Number(f.height) === t.height || String(f.qualityLabel || '').startsWith(t.quality)) &&
              (f.mimeType || '').includes('video/') &&
              f.url
          )
        : null;
    const match = avcMatch || fallbackMatch;

    if (match && match.url) {
      const isAvc = t.itags.includes(Number(match.itag)) || (match.mimeType || '').includes('avc1');
      const totalBytes = formatContentLength(match) + formatContentLength(audioTrack);
      const muxAudio = Boolean(audioTrack);
      const ticket = registerTicket({
        videoUrl: match.url,
        audioUrl: audioTrack?.url || '',
        ua: clientUa,
        videoId,
        itag: match.itag,
        quality: t.quality,
        container: 'MP4',
        muxAudio,
        needsTranscode: !isAvc,
        needsAudioTranscode,
      });
      opts.push({
        id: `hd-${match.itag}`,
        itag: match.itag,
        label: match.qualityLabel?.includes('60') ? `${t.label} 60fps` : t.label,
        quality: t.quality,
        container: 'MP4',
        hasAudio: Boolean(audioTrack),
        muxAudio,
        videoUrl: match.url,
        audioUrl: audioTrack?.url,
        sizeBytes: totalBytes || undefined,
        ticket,
      });
    }
  }

  const muxedList = formats.filter((f) => f.url);
  for (const mf of muxedList) {
    const q = mf.qualityLabel || '360p';
    if (opts.some((o) => o.quality === q && !o.muxAudio)) continue;
    const ticket = registerTicket({
      videoUrl: mf.url,
      audioUrl: '',
      ua: clientUa,
      videoId,
      itag: mf.itag,
      quality: q,
      container: 'MP4',
      muxAudio: false,
      needsTranscode: false,
      needsAudioTranscode: false,
    });
    opts.push({
      id: `muxed-${mf.itag}`,
      itag: mf.itag,
      label: `${q} Quick MP4`,
      quality: q,
      container: 'MP4',
      hasAudio: true,
      muxAudio: false,
      videoUrl: mf.url,
      sizeBytes: formatContentLength(mf) || undefined,
      ticket,
    });
  }

  if (audioTrack && audioTrack.url) {
    const ticket = registerTicket({
      videoUrl: audioTrack.url,
      audioUrl: '',
      ua: clientUa,
      videoId,
      itag: audioTrack.itag,
      quality: 'Audio',
      container: 'M4A',
      muxAudio: false,
      needsTranscode: false,
      needsAudioTranscode: false,
    });
    opts.push({
      id: `audio-${audioTrack.itag}`,
      itag: audioTrack.itag,
      label: 'Audio Only (128kbps)',
      quality: 'Audio',
      container: 'M4A',
      hasAudio: true,
      muxAudio: false,
      videoUrl: audioTrack.url,
      sizeBytes: formatContentLength(audioTrack) || undefined,
      ticket,
    });
  }
  return opts;
}

async function runPrepareJob(ticketId, ticketData, ffmpegPath) {
  ensureTempDir();
  const job = ytJobs.get(ticketId);
  if (!job) return;

  const stamp = crypto.randomUUID();
  const tmpVideo = path.join(TEMP_DL_DIR, `v_${stamp}.mp4`);
  const tmpAudio = path.join(TEMP_DL_DIR, `a_${stamp}.m4a`);
  const tmpOut = path.join(TEMP_DL_DIR, `out_${stamp}.${ticketData.container === 'M4A' ? 'm4a' : 'mp4'}`);

  try {
    if (ticketData.muxAudio && ffmpegPath && ticketData.audioUrl) {
      let vLoaded = 0;
      let vTotal = 0;
      let aLoaded = 0;
      let aTotal = 0;

      const updateDlProgress = () => {
        const total = vTotal + aTotal;
        const pct = total > 0 ? Math.round(((vLoaded + aLoaded) / total) * 85) : 15;
        job.progress = Math.max(5, Math.min(85, pct));
        job.message = `Downloading ${ticketData.quality} video & audio (${job.progress}%)...`;
      };

      await Promise.all([
        downloadStreamToFile(ticketData.videoUrl, ticketData.ua, tmpVideo, (l, t) => {
          vLoaded = l;
          vTotal = t;
          updateDlProgress();
        }),
        downloadStreamToFile(ticketData.audioUrl, ticketData.ua, tmpAudio, (l, t) => {
          aLoaded = l;
          aTotal = t;
          updateDlProgress();
        }),
      ]);

      job.status = 'muxing';
      job.progress = 90;
      job.message = `Muxing ${ticketData.quality} MP4 with stereo audio...`;

      await runFfmpegLocalMux({
        ffmpegPath,
        videoPath: tmpVideo,
        audioPath: tmpAudio,
        outPath: tmpOut,
        transcodeVideo: Boolean(ticketData.needsTranscode),
        transcodeAudio: Boolean(ticketData.needsAudioTranscode),
      });

      safeUnlink(tmpVideo);
      safeUnlink(tmpAudio);
      const stat = fs.statSync(tmpOut);
      job.outPath = tmpOut;
      job.size = stat.size;
      job.contentType = 'video/mp4';
      job.status = 'ready';
      job.progress = 100;
      job.message = 'Ready — saving file to Downloads...';
      scheduleJobCleanup(ticketId, tmpOut);
    } else {
      await downloadStreamToFile(ticketData.videoUrl, ticketData.ua, tmpOut, (l, t) => {
        const pct = t > 0 ? Math.round((l / t) * 95) : 25;
        job.progress = Math.max(5, Math.min(95, pct));
        job.message = `Downloading ${ticketData.quality} (${job.progress}%)...`;
      });
      const stat = fs.statSync(tmpOut);
      job.outPath = tmpOut;
      job.size = stat.size;
      job.contentType = ticketData.container === 'M4A' ? 'audio/mp4' : 'video/mp4';
      job.status = 'ready';
      job.progress = 100;
      job.message = 'Ready — saving file to Downloads...';
      scheduleJobCleanup(ticketId, tmpOut);
    }
  } catch (err) {
    safeUnlink(tmpVideo);
    safeUnlink(tmpAudio);
    safeUnlink(tmpOut);
    job.status = 'error';
    job.progress = 0;
    job.error = err?.message || 'Download preparation failed';
    job.message = job.error;
  }
}

async function resolveFromYtdl(videoId, ffmpegPath, clients, ua) {
  try {
    const { Ytdl } = await import('@distube/ytdl-core');
    const ytdl = clients ? new Ytdl({ clients }) : new Ytdl();
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const allFormats = Array.isArray(info?.formats) ? info.formats : [];
    const muxed = allFormats.filter((f) => f.hasVideo && f.hasAudio && f.url);
    const adaptive = allFormats.filter((f) => !(f.hasVideo && f.hasAudio) && f.url);
    const opts = buildOptionsFromRaw(videoId, muxed, adaptive, ua, ffmpegPath);
    if (opts.length === 0) return null;
    const vd = info.videoDetails || {};
    const thumbs = vd.thumbnails || [];
    return {
      videoId,
      title: vd.title || 'YouTube Video',
      author: vd.author?.name || 'YouTube Creator',
      durationSeconds: Number(vd.lengthSeconds) || 0,
      thumbnail: thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      userAgent: ua,
      muxerAvailable: Boolean(ffmpegPath),
      options: opts,
    };
  } catch {
    return null;
  }
}

function buildContentDisposition(filename) {
  const safeRaw = String(filename || 'video.mp4').replace(/["\\/\r\n]/g, '_').trim() || 'video.mp4';
  const asciiFallback = safeRaw.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(safeRaw).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Shared HTTP handler for standalone YouTube downloader endpoints.
 */
export async function handleVideoDownloaderRoute(req, res, pathname, url) {
  if (pathname === '/api/yt-formats') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const videoId = url.searchParams.get('id') || '';
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid YouTube video ID' }));
        return true;
      }

      const ffmpegPath = resolveFfmpegPath();
      let resolved = null;
      let lastReason = '';

      // 1. Prefer VisionOS first (bypasses IOS 12MB 403 cutoff and ANDROID_VR LOGIN_REQUIRED)
      try {
        const { Client } = await import('@distube/ytdl-core');
        resolved = await resolveFromYtdl(videoId, ffmpegPath, [Client.VisionOS], VISIONOS_UA);
      } catch {}

      // 2. Fallback to InnerTube ANDROID_VR -> IOS clients
      if (!resolved) {
        for (const client of YT_CLIENTS) {
          const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': client.ua },
            body: JSON.stringify({
              context: { client: client.ctx },
              videoId,
            }),
            signal: AbortSignal.timeout(10000),
          });
          const data = await playerRes.json();
          if (data?.playabilityStatus?.status !== 'OK') {
            lastReason = data?.playabilityStatus?.reason || lastReason;
            continue;
          }
          const sd = data.streamingData || {};
          const opts = buildOptionsFromRaw(
            videoId,
            Array.isArray(sd.formats) ? sd.formats : [],
            Array.isArray(sd.adaptiveFormats) ? sd.adaptiveFormats : [],
            client.ua,
            ffmpegPath
          );
          if (opts.length > 0) {
            const details = data.videoDetails || {};
            const thumbs = details?.thumbnail?.thumbnails || [];
            resolved = {
              videoId,
              title: details.title || 'YouTube Video',
              author: details.author || 'YouTube Creator',
              durationSeconds: Number(details.lengthSeconds) || 0,
              thumbnail: thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              userAgent: client.ua,
              muxerAvailable: Boolean(ffmpegPath),
              options: opts,
            };
            break;
          }
        }
      }

      // 3. Final fallback across remaining ytdl-core clients (WebEmbedded, Tv, etc.)
      if (!resolved) {
        resolved = await resolveFromYtdl(videoId, ffmpegPath, undefined, VISIONOS_UA);
      }

      if (!resolved || resolved.options.length === 0) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            error: lastReason || 'No downloadable MP4 or M4A streams found for this video.',
          })
        );
        return true;
      }

      res.end(JSON.stringify(resolved));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Failed to inspect video formats' }));
    }
    return true;
  }

  if (pathname === '/api/yt-prepare-download') {
    res.setHeader('Content-Type', 'application/json');
    const ticketId = url.searchParams.get('ticket') || '';
    const ticketData = ticketId ? ytDownloadTickets.get(ticketId) : null;
    if (!ticketData) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Download ticket expired. Click Get Qualities again.' }));
      return true;
    }

    const existing = ytJobs.get(ticketId);
    if (!existing || existing.status === 'error') {
      ytJobs.set(ticketId, {
        status: 'downloading',
        progress: 3,
        message: `Starting ${ticketData.quality} download...`,
        outPath: '',
        size: 0,
        contentType: 'video/mp4',
        error: null,
        createdAt: Date.now(),
        cleanupTimer: null,
      });
      const ffmpegPath = resolveFfmpegPath();
      runPrepareJob(ticketId, ticketData, ffmpegPath);
    }

    res.end(JSON.stringify({ started: true, ticket: ticketId }));
    return true;
  }

  if (pathname === '/api/yt-download-status') {
    res.setHeader('Content-Type', 'application/json');
    const ticketId = url.searchParams.get('ticket') || '';
    const job = ticketId ? ytJobs.get(ticketId) : null;
    if (!job) {
      res.statusCode = 404;
      res.end(JSON.stringify({ status: 'error', progress: 0, error: 'Job not found' }));
      return true;
    }
    res.end(
      JSON.stringify({
        status: job.status,
        progress: job.progress,
        message: job.message,
        error: job.error,
        size: job.size,
      })
    );
    return true;
  }

  if (pathname === '/api/yt-download-file' || pathname === '/api/yt-video-download') {
    const ticketId = url.searchParams.get('ticket') || '';
    const filename = url.searchParams.get('filename') || 'video.mp4';
    const job = ticketId ? ytJobs.get(ticketId) : null;

    if (job && job.status === 'ready' && job.outPath && fs.existsSync(job.outPath)) {
      const fileToServe = job.outPath;
      const totalSize = Number(job.size || fs.statSync(fileToServe).size);
      // Extend retention on access so HEAD probes, Range requests, and retries all succeed
      scheduleJobCleanup(ticketId, fileToServe);

      res.setHeader('Content-Type', job.contentType || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', buildContentDisposition(filename));

      const rangeHeader = req.headers.range;
      let start = 0;
      let end = totalSize - 1;
      let isPartial = false;

      if (rangeHeader && /^bytes=\d*-\d*$/i.test(rangeHeader)) {
        const [rawStart, rawEnd] = rangeHeader.replace(/^bytes=/i, '').split('-');
        start = rawStart ? Number(rawStart) : 0;
        end = rawEnd ? Math.min(totalSize - 1, Number(rawEnd)) : totalSize - 1;
        if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${totalSize}`);
          res.end();
          return true;
        }
        isPartial = true;
      }

      const chunkLength = end - start + 1;
      res.statusCode = isPartial ? 206 : 200;
      res.setHeader('Content-Length', String(chunkLength));
      if (isPartial) {
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      }

      if (req.method === 'HEAD') {
        res.end();
        return true;
      }

      await new Promise((resolve) => {
        const stream = fs.createReadStream(fileToServe, {
          start,
          end,
          highWaterMark: 512 * 1024,
        });
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        stream.on('data', (chunk) => {
          if (!res.write(chunk)) {
            stream.pause();
            res.once('drain', () => stream.resume());
          }
        });
        stream.on('end', () => {
          res.end();
          done();
        });
        stream.on('error', () => {
          if (!res.writableEnded) res.end();
          done();
        });
        res.on('close', () => {
          stream.destroy();
          done();
        });
      });
      return true;
    }

    res.statusCode = 404;
    res.end('Prepared file not found or expired.');
    return true;
  }

  return false;
}
