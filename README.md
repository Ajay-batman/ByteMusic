# ByteMusic 🎵

> **High-Fidelity Audio Streaming & Offline Player for Web & Android**

ByteMusic is an independent, clean-room music player application built with React, TypeScript, Tailwind CSS, and Capacitor for Android.

---

## ✨ Features

- **Uninterrupted Background Playback:** Plays full audio continuously on mobile even when the app is minimized or the screen is locked via Android Foreground Audio Services (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`).
- **Download While Listening:** Instant 1-tap download saving clean, tagged `.m4a` audio files directly to your device's Downloads directory.
- **Offline Cache Storage:** Automatic on-device audio caching so your favorite songs play even with no internet connection.
- **Liquid Glass & Classic Dark Themes:** Fluid ambient lighting and clean dark aesthetic.
- **Lock-Screen & Notification Controls:** Integrated system `MediaSession` controls (Play, Pause, Skip, Scrub) on Android lock screens and notification shades.
- **Automated Android APK Builds:** Continuous integration via GitHub Actions building standalone Android debug APKs.

---

## 🚀 Quick Start (Web)

```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev

# Build production bundle
npm run build
```

---

## 📱 Android APK Build

This repository includes a GitHub Actions workflow (`.github/workflows/build-apk.yml`) that automatically builds the Android APK on every push.

You can download the generated `ByteMusic-debug-apk` directly from the **Actions** tab of this repository.

To open the project in Android Studio locally:
```bash
npx cap open android
```

---

## 📄 License
MIT License
