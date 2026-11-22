package com.bytemusic.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static MainActivity instance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        // Request POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }

        // Start Foreground Background Audio Service
        try {
            Intent serviceIntent = new Intent(this, BackgroundAudioService.class);
            ContextCompat.startForegroundService(this, serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Native Media Bridge: Syncs web playback state with Android Lock Screen & Notification
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void updateMetadata(String title, String artist, String album, String imageUrl, long durationMs, long positionMs, boolean isPlaying) {
                    BackgroundAudioService.updateMedia(MainActivity.this, title, artist, album, imageUrl, durationMs, positionMs, isPlaying);
                }

                @JavascriptInterface
                public void updatePlaybackState(boolean isPlaying, long positionMs) {
                    BackgroundAudioService.updatePlaybackState(MainActivity.this, isPlaying, positionMs);
                }
            }, "NativeMediaBridge");
        }
    }

    public static void dispatchMediaAction(String action) {
        if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
            instance.runOnUiThread(() -> {
                instance.bridge.getWebView().evaluateJavascript(
                    "if (typeof window.bytemusic_mediaAction === 'function') { window.bytemusic_mediaAction('" + action + "'); } else { window.dispatchEvent(new CustomEvent('bytemusic-media-action', { detail: '" + action + "' })); }",
                    null
                );
            });
        }
    }

    public static void dispatchMediaSeek(long positionMs) {
        if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
            instance.runOnUiThread(() -> {
                instance.bridge.getWebView().evaluateJavascript(
                    "if (typeof window.bytemusic_mediaSeek === 'function') { window.bytemusic_mediaSeek(" + positionMs + "); } else { window.dispatchEvent(new CustomEvent('bytemusic-media-seek', { detail: " + positionMs + " })); }",
                    null
                );
            });
        }
    }

    @Override
    public void onBackPressed() {
        // Pure music app behavior: minimize to background instead of killing playback
        moveTaskToBack(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep WebView media & timers alive in background
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.onResume();
            webView.resumeTimers();
            webView.dispatchWindowVisibilityChanged(View.VISIBLE);
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        // Keep audio thread active during screen off
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.onResume();
            webView.resumeTimers();
            webView.dispatchWindowVisibilityChanged(View.VISIBLE);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (instance == this) {
            instance = null;
        }
        try {
            Intent serviceIntent = new Intent(this, BackgroundAudioService.class);
            stopService(serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
