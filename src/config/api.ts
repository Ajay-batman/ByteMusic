import { Capacitor } from '@capacitor/core';

export const DEFAULT_SERVER_URL = 'https://revelation-fin-comments-jesse.trycloudflare.com';
export const LOCAL_WIFI_URL = 'http://10.206.64.211:3000';

/**
 * Returns the base URL for backend API requests.
 * - On Web/Desktop: returns customHost if set, otherwise '' (relative path: /api/...)
 * - On Native Android (Capacitor): returns customHost, or envUrl, or active tunnel fallback
 */
export const getApiBaseUrl = (): string => {
  const customHost = localStorage.getItem('spotify_custom_api_host');
  if (customHost) {
    return customHost.replace(/\/$/, '');
  }

  if (Capacitor.isNativePlatform()) {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return (envUrl || DEFAULT_SERVER_URL).replace(/\/$/, '');
  }

  // Desktop/Web defaults to relative path for existing behavior
  return '';
};

export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};

export const setCustomApiHost = (url: string): void => {
  if (!url || !url.trim()) {
    localStorage.removeItem('spotify_custom_api_host');
  } else {
    localStorage.setItem('spotify_custom_api_host', url.trim().replace(/\/$/, ''));
  }
};

export const testServerConnection = async (targetUrl?: string): Promise<{ ok: boolean; latencyMs: number; message?: string }> => {
  const base = targetUrl !== undefined ? targetUrl.replace(/\/$/, '') : getApiBaseUrl();
  const testEndpoint = base ? `${base}/api/library` : '/api/library';
  const start = Date.now();
  try {
    const res = await fetch(testEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, message: `Server returned HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, message: err.message || 'Connection failed' };
  }
};
