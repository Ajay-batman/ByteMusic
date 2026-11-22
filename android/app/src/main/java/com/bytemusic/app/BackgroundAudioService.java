package com.bytemusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.view.KeyEvent;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BackgroundAudioService extends Service {
    public static final String ACTION_TOGGLE = "com.bytemusic.app.ACTION_TOGGLE";
    public static final String ACTION_NEXT = "com.bytemusic.app.ACTION_NEXT";
    public static final String ACTION_PREV = "com.bytemusic.app.ACTION_PREV";
    public static final String ACTION_UPDATE_META = "com.bytemusic.app.ACTION_UPDATE_META";
    public static final String ACTION_UPDATE_STATE = "com.bytemusic.app.ACTION_UPDATE_STATE";

    // Incremented channel ID to force Android to apply IMPORTANCE_DEFAULT on existing installs
    private static final String CHANNEL_ID = "bytemusic_playback_v5";
    private static final int NOTIFICATION_ID = 1001;

    private PowerManager.WakeLock wakeLock;
    private MediaSessionCompat mediaSession;

    private String trackTitle = "ByteMusic";
    private String trackArtist = "Now Playing";
    private String trackAlbum = "ByteMusic Library";
    private String trackImageUrl = null;
    private long trackDurationMs = 0;
    private long currentPositionMs = 0;
    private boolean isPlaying = false;
    private Bitmap albumArtBitmap = null;
    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();

    public static void updateMedia(Context context, String title, String artist, String album, String imageUrl, long durationMs, long positionMs, boolean isPlaying) {
        try {
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(ACTION_UPDATE_META);
            intent.putExtra("title", title != null ? title : "ByteMusic");
            intent.putExtra("artist", artist != null ? artist : "Now Playing");
            intent.putExtra("album", album != null ? album : "");
            intent.putExtra("imageUrl", imageUrl != null ? imageUrl : "");
            intent.putExtra("durationMs", durationMs);
            intent.putExtra("positionMs", positionMs);
            intent.putExtra("isPlaying", isPlaying);
            ContextCompat.startForegroundService(context, intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updatePlaybackState(Context context, boolean isPlaying, long positionMs) {
        try {
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(ACTION_UPDATE_STATE);
            intent.putExtra("isPlaying", isPlaying);
            intent.putExtra("positionMs", positionMs);
            ContextCompat.startForegroundService(context, intent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadArtwork(String imageUrl) {
        if (imageUrl == null || imageUrl.trim().isEmpty() || imageUrl.equals(trackImageUrl)) {
            return;
        }
        trackImageUrl = imageUrl;
        imageExecutor.execute(() -> {
            try {
                URL url = new URL(imageUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.connect();
                InputStream input = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                input.close();
                conn.disconnect();
                if (bitmap != null) {
                    albumArtBitmap = bitmap;
                    updateNotification();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ByteMusic::MediaWakeLock");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hours max
        }

        // Initialize Android Native MediaSessionCompat
        mediaSession = new MediaSessionCompat(this, "ByteMusicSession");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        // Wire system media button receiver
        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON);
        mediaButtonIntent.setClass(this, MediaButtonReceiver.class);
        PendingIntent mbrPendingIntent = PendingIntent.getBroadcast(
                this, 0, mediaButtonIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession.setMediaButtonReceiver(mbrPendingIntent);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                isPlaying = true;
                updateNotification();
                MainActivity.dispatchMediaAction("play");
            }

            @Override
            public void onPause() {
                isPlaying = false;
                updateNotification();
                MainActivity.dispatchMediaAction("pause");
            }

            @Override
            public void onSkipToNext() {
                updateNotification();
                MainActivity.dispatchMediaAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                updateNotification();
                MainActivity.dispatchMediaAction("prev");
            }

            @Override
            public void onSeekTo(long pos) {
                super.onSeekTo(pos);
                currentPositionMs = pos;
                int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
                float speed = isPlaying ? 1.0f : 0.0f;
                mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                        .setActions(PlaybackStateCompat.ACTION_PLAY |
                                    PlaybackStateCompat.ACTION_PAUSE |
                                    PlaybackStateCompat.ACTION_PLAY_PAUSE |
                                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                                    PlaybackStateCompat.ACTION_SEEK_TO)
                        .setState(state, currentPositionMs, speed)
                        .build());
                MainActivity.dispatchMediaSeek(pos);
            }

            @Override
            public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
                if (mediaButtonEvent != null && Intent.ACTION_MEDIA_BUTTON.equals(mediaButtonEvent.getAction())) {
                    KeyEvent event = mediaButtonEvent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                    if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                        switch (event.getKeyCode()) {
                            case KeyEvent.KEYCODE_MEDIA_PLAY:
                                onPlay();
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                                onPause();
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                            case KeyEvent.KEYCODE_HEADSETHOOK:
                                if (isPlaying) onPause(); else onPlay();
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_NEXT:
                                onSkipToNext();
                                return true;
                            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                                onSkipToPrevious();
                                return true;
                        }
                    }
                }
                return super.onMediaButtonEvent(mediaButtonEvent);
            }
        });
        mediaSession.setActive(true);

        updateNotification();
    }

    private void updateNotification() {
        if (mediaSession == null) return;

        long actions = PlaybackStateCompat.ACTION_PLAY |
                       PlaybackStateCompat.ACTION_PAUSE |
                       PlaybackStateCompat.ACTION_PLAY_PAUSE |
                       PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                       PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackStateCompat.ACTION_SEEK_TO;

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        float speed = isPlaying ? 1.0f : 0.0f;
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, currentPositionMs, speed);
        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, trackTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, trackArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, trackAlbum);

        if (trackDurationMs > 0) {
            metaBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, trackDurationMs);
        }

        if (albumArtBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, albumArtBitmap);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, albumArtBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());

        // Direct Service PendingIntents for playback actions
        Intent prevIntent = new Intent(this, BackgroundAudioService.class).setAction(ACTION_PREV);
        PendingIntent prevPending = PendingIntent.getService(this, 101, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent toggleIntent = new Intent(this, BackgroundAudioService.class).setAction(ACTION_TOGGLE);
        PendingIntent togglePending = PendingIntent.getService(this, 102, toggleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent nextIntent = new Intent(this, BackgroundAudioService.class).setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getService(this, 103, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent openAppIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPending = PendingIntent.getActivity(this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notifBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(trackTitle)
                .setContentText(trackArtist)
                .setSubText(trackAlbum)
                .setContentIntent(contentPending)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setOnlyAlertOnce(true)
                .setOngoing(isPlaying)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, isPlaying ? "Pause" : "Play", togglePending)
                .addAction(android.R.drawable.ic_media_next, "Next", nextPending)
                .setStyle(new MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        if (albumArtBitmap != null) {
            notifBuilder.setLargeIcon(albumArtBitmap);
        }

        Notification notification = notifBuilder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // IMPORTANCE_DEFAULT ensures visibility on Lock Screen and modern SystemUI Media Card
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "ByteMusic Playback Controls",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Controls for ByteMusic playback on lock screen and notification panel");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(null, null);
            channel.enableVibration(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_TOGGLE.equals(action)) {
                if (isPlaying) {
                    if (mediaSession != null && mediaSession.getController() != null) {
                        mediaSession.getController().getTransportControls().pause();
                    }
                } else {
                    if (mediaSession != null && mediaSession.getController() != null) {
                        mediaSession.getController().getTransportControls().play();
                    }
                }
            } else if (ACTION_NEXT.equals(action)) {
                if (mediaSession != null && mediaSession.getController() != null) {
                    mediaSession.getController().getTransportControls().skipToNext();
                }
            } else if (ACTION_PREV.equals(action)) {
                if (mediaSession != null && mediaSession.getController() != null) {
                    mediaSession.getController().getTransportControls().skipToPrevious();
                }
            } else if (Intent.ACTION_MEDIA_BUTTON.equals(action)) {
                MediaButtonReceiver.handleIntent(mediaSession, intent);
            } else if (ACTION_UPDATE_META.equals(action)) {
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                String album = intent.getStringExtra("album");
                String imageUrl = intent.getStringExtra("imageUrl");
                long dur = intent.getLongExtra("durationMs", 0);
                long pos = intent.getLongExtra("positionMs", 0);
                if (title != null) trackTitle = title;
                if (artist != null) trackArtist = artist;
                if (album != null) trackAlbum = album;
                if (dur > 0) trackDurationMs = dur;
                currentPositionMs = pos;
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                if (imageUrl != null && !imageUrl.isEmpty()) {
                    loadArtwork(imageUrl);
                }
            } else if (ACTION_UPDATE_STATE.equals(action)) {
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                currentPositionMs = intent.getLongExtra("positionMs", currentPositionMs);
            }
        }
        // Ensure startForeground is always satisfied on every onStartCommand
        updateNotification();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        imageExecutor.shutdown();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
