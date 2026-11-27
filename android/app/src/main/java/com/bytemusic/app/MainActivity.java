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
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.util.Collections;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    public static MainActivity instance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YouTubeDownloaderPlugin.class);
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
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setOffscreenPreRaster(true);

            // Force hardware acceleration layer for smooth 60fps animations & transitions
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // Prevent YouTube iframe from auto-pausing when app is minimized by injecting visibility override into all frames
            try {
                if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                    Set<String> origins = Collections.singleton("*");
                    WebViewCompat.addDocumentStartJavaScript(
                        webView,
                        "try {" +
                        "  Object.defineProperties(document, {" +
                        "    hidden: { value: false, writable: false }," +
                        "    visibilityState: { value: 'visible', writable: false }," +
                        "    webkitHidden: { value: false, writable: false }," +
                        "    webkitVisibilityState: { value: 'visible', writable: false }" +
                        "  });" +
                        "  if (typeof document.hasFocus === 'function') { document.hasFocus = function() { return true; }; }" +
                        "  try { Object.defineProperty(document, 'onvisibilitychange', { get: function() { return null; }, set: function() {} }); } catch (e) {}" +
                        "  try { Object.defineProperty(window, 'onpagehide', { get: function() { return null; }, set: function() {} }); } catch (e) {}" +
                        "  try { Object.defineProperty(window, 'onblur', { get: function() { return null; }, set: function() {} }); } catch (e) {}" +
                        "  window.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);" +
                        "  document.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);" +
                        "  window.addEventListener('blur', function(e) { e.stopImmediatePropagation(); }, true);" +
                        "  window.addEventListener('pagehide', function(e) { e.stopImmediatePropagation(); }, true);" +
                        "  window.addEventListener('freeze', function(e) { e.stopImmediatePropagation(); }, true);" +
                        "} catch (e) {}",
                        origins
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

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
                String js = "window.bytemusic_mediaAction ? window.bytemusic_mediaAction('" + action + "') : window.dispatchEvent(new CustomEvent('bytemusic-media-action', { detail: '" + action + "' }));";
                instance.bridge.getWebView().evaluateJavascript(js, null);
            });
        }
    }

    public static void dispatchMediaSeek(long positionMs) {
        if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
            instance.runOnUiThread(() -> {
                String js = "window.bytemusic_mediaSeek ? window.bytemusic_mediaSeek(" + positionMs + ") : window.dispatchEvent(new CustomEvent('bytemusic-media-seek', { detail: " + positionMs + " }));";
                instance.bridge.getWebView().evaluateJavascript(js, null);
            });
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus) {
            keepWebViewAlive();
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
        keepWebViewAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAlive();
    }

    private void keepWebViewAlive() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (instance == this) {
            instance = null;
        }
    }
}
