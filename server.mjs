import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Ytdl, Client } from '@distube/ytdl-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const dataDir = path.resolve(__dirname, 'data');
const libraryFile = path.resolve(dataDir, 'library.json');

const ytInstance = new Ytdl({
  clients: [Client.VisionOS, Client.Tv, Client.WebEmbedded],
});
const streamUrlCache = new Map(); // id -> { url, expireAt }

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
  // Permissive CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // API: /api/health
  if (url.pathname === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', service: 'ByteMusic Server', timestamp: Date.now() }));
    return;
  }

  // API: /api/library
  if (url.pathname === '/api/library') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      if (!fs.existsSync(libraryFile)) {
        res.end(JSON.stringify({ likedTracks: null, recentlyPlayed: null, customPlaylists: null }));
        return;
      }
      res.end(fs.readFileSync(libraryFile, 'utf-8'));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          JSON.parse(body);
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(libraryFile, body, 'utf-8');
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // API: /api/resolve-yt
  if (url.pathname === '/api/resolve-yt') {
    const q = url.searchParams.get('q');
    res.setHeader('Content-Type', 'application/json');
    if (!q) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing query parameter q' }));
      return;
    }
    try {
      const ytRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          query: `${q} official audio`,
        }),
      });
      const data = await ytRes.json();
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
      let videoId = null;
      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item?.videoRenderer?.videoId) {
            videoId = item.videoRenderer.videoId;
            break;
          }
        }
      }
      res.end(JSON.stringify({ videoId }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: /api/stream?id=VIDEO_ID (Full-Song Audio Stream Proxy for Native HTML5 Background Play)
  if (url.pathname === '/api/stream') {
    const id = url.searchParams.get('id');
    if (!id) {
      res.statusCode = 400;
      res.end('Missing id parameter');
      return;
    }

    try {
      let streamUrl = null;
      const cached = streamUrlCache.get(id);
      if (cached && cached.expireAt > Date.now()) {
        streamUrl = cached.url;
      } else {
        const info = await ytInstance.getInfo(`https://www.youtube.com/watch?v=${id}`);
        // itag 140 is AAC 128kbps, ideal for mobile audio playback
        const format =
          info.formats.find((f) => f.itag === 140) ||
          info.formats.find((f) => f.hasAudio && !f.hasVideo);
        if (format && format.url) {
          streamUrl = format.url;
          streamUrlCache.set(id, { url: streamUrl, expireAt: Date.now() + 3600000 });
        }
      }

      if (!streamUrl) {
        res.statusCode = 404;
        res.end('Audio stream not found');
        return;
      }

      const range = req.headers.range;
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (range) headers['Range'] = range;

      const upstream = await fetch(streamUrl, { headers });
      res.statusCode = upstream.status;
      for (const [k, v] of upstream.headers.entries()) {
        if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=1800');

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      if (!upstream.body) {
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
      let isAborted = false;
      req.on('close', () => {
        isAborted = true;
        reader.cancel().catch(() => {});
      });

      while (!isAborted) {
        const { done, value } = await reader.read();
        if (done || isAborted) break;
        res.write(value);
      }
      if (!isAborted) {
        res.end();
      }
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(err.message);
      }
    }
    return;
  }

  // API: /api/download?id=VIDEO_ID&filename=... (High-Speed Chunked Attachment Download)
  if (url.pathname === '/api/download') {
    const id = url.searchParams.get('id');
    const filename = url.searchParams.get('filename') || 'audio.m4a';
    if (!id) {
      res.statusCode = 400;
      res.end('Missing id parameter');
      return;
    }

    try {
      const stream = ytInstance.download(`https://www.youtube.com/watch?v=${id}`, {
        filter: (f) => f.hasAudio && !f.hasVideo,
        dlChunkSize: 1024 * 1024,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');

      req.on('close', () => {
        stream.destroy();
      });

      stream.pipe(res);
      stream.on('error', (err) => {
        console.warn('Download stream error:', err.message);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(err.message);
        }
      });
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(err.message);
      }
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(distDir, url.pathname);
  if (url.pathname === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.end(content);
  } catch (err) {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Spotify Standalone Server] Listening at http://0.0.0.0:${PORT}`);
});
