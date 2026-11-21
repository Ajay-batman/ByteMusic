import { Capacitor } from '@capacitor/core';

/**
 * Returns the base URL for backend API requests.
 * - On Web/Desktop: returns '' (relative path: /api/...)
 * - On Native Android (Capacitor): returns the configured backend host
 */
export const getApiBaseUrl = (): string => {
  const customHost = localStorage.getItem('spotify_custom_api_host');
  if (customHost) {
    return customHost.replace(/\/$/, '');
  }

  if (Capacitor.isNativePlatform()) {
    // If running inside the Android APK, point to remote server or cloud endpoint
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return (envUrl || 'https://journalists-irrigation-neighborhood-coupon.trycloudflare.com').replace(/\/$/, '');
  }

  return '';
};

export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};
