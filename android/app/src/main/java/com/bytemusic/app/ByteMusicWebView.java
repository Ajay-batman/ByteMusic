package com.bytemusic.app;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import com.getcapacitor.CapacitorWebView;

/**
 * ByteMusicWebView overrides Android View visibility and lifecycle events to prevent
 * Chromium from detecting window backgrounding/minimization.
 *
 * In standard Android WebView, dispatchWindowVisibilityChanged(View.GONE) causes Chromium
 * to invoke WebContentsImpl::OnHide(), suspending media decoders and pausing <video> tags.
 * By permanently routing visibility as View.VISIBLE and suppressing onPause/pauseTimers,
 * background audio streams continuously with zero pause/re-buffer glitches.
 */
public class ByteMusicWebView extends CapacitorWebView {

    public ByteMusicWebView(Context context) {
        super(context, null);
    }

    public ByteMusicWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public ByteMusicWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs);
    }

    @Override
    public void dispatchWindowVisibilityChanged(int visibility) {
        // Intercept before Chromium AwContents ever sees GONE or INVISIBLE
        super.dispatchWindowVisibilityChanged(View.VISIBLE);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        // Chromium hooks onWindowVisibilityChanged to suspend WebContents
        super.onWindowVisibilityChanged(View.VISIBLE);
    }

    @Override
    protected void onVisibilityChanged(View changedView, int visibility) {
        super.onVisibilityChanged(changedView, View.VISIBLE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasWindowFocus) {
        super.onWindowFocusChanged(true);
    }

    @Override
    public void onPause() {
        // Suppress onPause! Calling super.onPause() instructs Chromium to freeze timers and suspend media
    }

    @Override
    public void pauseTimers() {
        // Suppress pauseTimers() to ensure continuous background audio execution
    }
}
