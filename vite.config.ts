import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, 'data');
const libraryFile = path.resolve(dataDir, 'library.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-library-and-youtube-resolver',
      configureServer(server) {
        // Persistent Local Library Storage API (Disk Caching across sessions & browsers)
        server.middlewares.use('/api/library', async (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(libraryFile)) {
                res.end(JSON.stringify({ likedTracks: null, recentlyPlayed: null, customPlaylists: null }));
                return;
              }
              const content = fs.readFileSync(libraryFile, 'utf-8');
              res.end(content);
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                JSON.parse(body); // Validate JSON
                fs.writeFileSync(libraryFile, body, 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
            return;
          }
        });

        // Spotube/ViMusic Internal YouTube Audio Resolver
        server.middlewares.use('/api/resolve-yt', async (req, res) => {
          try {
            const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`);
            const q = parsedUrl.searchParams.get('q');
            if (!q) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing query parameter q' }));
              return;
            }

            const payload = {
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20240101.01.00',
                  hl: 'en',
                  gl: 'US',
                },
              },
              query: `${q} official audio`,
            };

            const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              body: JSON.stringify(payload),
            });

            const data: any = await response.json();
            const contents =
              data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
                ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

            let videoId: string | null = null;
            if (Array.isArray(contents)) {
              for (const item of contents) {
                if (item?.videoRenderer?.videoId) {
                  videoId = item.videoRenderer.videoId;
                  break;
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videoId }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    allowedHosts: true,
  },
});
