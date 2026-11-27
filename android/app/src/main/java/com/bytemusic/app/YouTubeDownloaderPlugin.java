package com.bytemusic.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "YouTubeDownloader")
public class YouTubeDownloaderPlugin extends Plugin {
    private static final String DOWNLOAD_CHANNEL_ID = "bytemusic_downloads";
    private static final long CHUNK_SIZE_BYTES = 4L * 1024L * 1024L;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private interface StreamProgressListener {
        void onBytes(long received, long total);
    }

    @PluginMethod
    public void downloadVideo(PluginCall call) {
        String videoUrl = call.getString("videoUrl");
        String audioUrl = call.getString("audioUrl");
        String rawFileName = call.getString("fileName", "ByteMusic_Video.mp4");
        String title = call.getString("title", "YouTube Video");
        String qualityLabel = call.getString("qualityLabel", "MP4");
        String userAgent = call.getString("userAgent");
        boolean muxAudio = Boolean.TRUE.equals(call.getBoolean("muxAudio", false));

        if (videoUrl == null || videoUrl.trim().isEmpty()) {
            call.reject("Missing videoUrl");
            return;
        }
        if (muxAudio && (audioUrl == null || audioUrl.trim().isEmpty())) {
            call.reject("Missing audioUrl for HD muxing");
            return;
        }

        String safeFileName = sanitizeFileName(rawFileName);
        Context context = getContext();

        executor.execute(() -> {
            try {
                if (!muxAudio) {
                    runDirectDownload(context, call, videoUrl, safeFileName, title, qualityLabel, userAgent);
                } else {
                    runMuxedDownload(context, call, videoUrl, audioUrl, safeFileName, title, qualityLabel, userAgent);
                }
            } catch (Exception err) {
                emitProgress("error", 0, err.getMessage() != null ? err.getMessage() : "Download failed");
                call.reject(err.getMessage() != null ? err.getMessage() : "Download failed");
            }
        });
    }

    private void runDirectDownload(
        Context context,
        PluginCall call,
        String url,
        String fileName,
        String title,
        String qualityLabel,
        String userAgent
    ) throws Exception {
        String stamp = String.valueOf(System.currentTimeMillis());
        boolean isAudio = fileName.toLowerCase().endsWith(".m4a");
        String mimeType = isAudio ? "audio/mp4" : "video/mp4";
        File tempFile = new File(context.getCacheDir(), "bm_dl_" + stamp + (isAudio ? ".m4a" : ".mp4"));
        if (tempFile.exists()) tempFile.delete();

        try {
            emitProgress("downloading", 3, "Downloading " + qualityLabel + " (4 MB chunks)...");
            downloadStreamWithChunks(url, userAgent, tempFile, (received, total) -> {
                int pct = total > 0 ? (int) Math.max(5, Math.min(93, (received * 93L) / total)) : 30;
                emitProgress("downloading", pct, "Downloading " + qualityLabel + " (" + pct + "%)...");
            });

            emitProgress("saving", 96, "Saving to Downloads/ByteMusic...");
            saveToPublicDownloads(context, tempFile, fileName, mimeType);
            postCompletedNotification(context, title, qualityLabel, fileName);

            emitProgress("completed", 100, "Saved to Downloads/ByteMusic/" + fileName);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("path", "Downloads/ByteMusic/" + fileName);
            result.put("fileName", fileName);
            result.put("muxed", false);
            call.resolve(result);
        } finally {
            if (tempFile.exists()) tempFile.delete();
        }
    }

    private void runMuxedDownload(
        Context context,
        PluginCall call,
        String videoUrl,
        String audioUrl,
        String fileName,
        String title,
        String qualityLabel,
        String userAgent
    ) throws Exception {
        String stamp = String.valueOf(System.currentTimeMillis());
        File videoTempFile = new File(context.getCacheDir(), "bm_v_" + stamp + ".mp4");
        File audioTempFile = new File(context.getCacheDir(), "bm_a_" + stamp + ".m4a");
        File muxedTempFile = new File(context.getCacheDir(), "bm_mux_" + stamp + ".mp4");

        if (videoTempFile.exists()) videoTempFile.delete();
        if (audioTempFile.exists()) audioTempFile.delete();
        if (muxedTempFile.exists()) muxedTempFile.delete();

        try {
            emitProgress("downloading", 3, "Downloading " + qualityLabel + " video & audio streams...");

            AtomicLong vLoaded = new AtomicLong(0);
            AtomicLong vTotal = new AtomicLong(Math.max(0L, extractContentLength(videoUrl)));
            AtomicLong aLoaded = new AtomicLong(0);
            AtomicLong aTotal = new AtomicLong(Math.max(0L, extractContentLength(audioUrl)));
            AtomicLong lastEmitMs = new AtomicLong(0);

            Runnable emitCombined = () -> {
                long now = System.currentTimeMillis();
                long prev = lastEmitMs.get();
                if (now - prev < 250) return;
                lastEmitMs.set(now);
                long total = vTotal.get() + aTotal.get();
                int pct = total > 0
                    ? (int) Math.max(4, Math.min(78, ((vLoaded.get() + aLoaded.get()) * 78L) / total))
                    : 20;
                emitProgress("downloading", pct, "Downloading " + qualityLabel + " (" + pct + "%)...");
            };

            Future<?> videoFuture = executor.submit(() -> {
                downloadStreamWithChunks(videoUrl, userAgent, videoTempFile, (r, t) -> {
                    vLoaded.set(r);
                    if (t > 0) vTotal.set(t);
                    emitCombined.run();
                });
                return null;
            });

            Future<?> audioFuture = executor.submit(() -> {
                downloadStreamWithChunks(audioUrl, userAgent, audioTempFile, (r, t) -> {
                    aLoaded.set(r);
                    if (t > 0) aTotal.set(t);
                    emitCombined.run();
                });
                return null;
            });

            videoFuture.get();
            audioFuture.get();

            if (!videoTempFile.exists() || !audioTempFile.exists()) {
                throw new Exception("Downloaded stream temp files missing");
            }

            emitProgress("muxing", 82, "Muxing " + qualityLabel + " MP4 with audio (MediaMuxer)...");
            muxVideoAndAudio(videoTempFile.getAbsolutePath(), audioTempFile.getAbsolutePath(), muxedTempFile.getAbsolutePath());

            emitProgress("saving", 96, "Saving final MP4 to Downloads/ByteMusic...");
            saveToPublicDownloads(context, muxedTempFile, fileName, "video/mp4");
            postCompletedNotification(context, title, qualityLabel, fileName);

            emitProgress("completed", 100, "Saved to Downloads/ByteMusic/" + fileName);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("path", "Downloads/ByteMusic/" + fileName);
            result.put("fileName", fileName);
            result.put("muxed", true);
            call.resolve(result);
        } finally {
            if (videoTempFile.exists()) videoTempFile.delete();
            if (audioTempFile.exists()) audioTempFile.delete();
            if (muxedTempFile.exists()) muxedTempFile.delete();
        }
    }

    private long extractContentLength(String streamUrl) {
        try {
            String clen = Uri.parse(streamUrl).getQueryParameter("clen");
            return clen != null ? Long.parseLong(clen) : 0L;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private void downloadStreamWithChunks(
        String streamUrl,
        String userAgent,
        File destFile,
        StreamProgressListener listener
    ) throws Exception {
        long total = extractContentLength(streamUrl);
        long received = 0L;

        try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(destFile), 64 * 1024)) {
            byte[] buf = new byte[64 * 1024];

            if (total > 0L) {
                long start = 0L;
                while (start < total) {
                    long end = Math.min(total - 1L, start + CHUNK_SIZE_BYTES - 1L);
                    Exception lastErr = null;
                    boolean chunkDone = false;

                    for (int attempt = 0; attempt < 2 && !chunkDone; attempt++) {
                        HttpURLConnection conn = null;
                        try {
                            conn = (HttpURLConnection) new URL(streamUrl).openConnection();
                            conn.setConnectTimeout(20000);
                            conn.setReadTimeout(35000);
                            conn.setInstanceFollowRedirects(true);
                            if (userAgent != null && !userAgent.isEmpty()) {
                                conn.setRequestProperty("User-Agent", userAgent);
                            }
                            conn.setRequestProperty("Range", "bytes=" + start + "-" + end);

                            int code = conn.getResponseCode();
                            if (code < 200 || code >= 300) {
                                throw new Exception("Upstream chunk HTTP " + code);
                            }

                            try (InputStream in = conn.getInputStream()) {
                                int len;
                                while ((len = in.read(buf)) > 0) {
                                    out.write(buf, 0, len);
                                    received += len;
                                    if (listener != null) listener.onBytes(received, total);
                                }
                            }
                            chunkDone = true;
                        } catch (Exception e) {
                            lastErr = e;
                            if (attempt == 0) Thread.sleep(250);
                        } finally {
                            if (conn != null) conn.disconnect();
                        }
                    }

                    if (!chunkDone) {
                        throw (lastErr != null ? lastErr : new Exception("Chunk download failed"));
                    }
                    start = end + 1L;
                }
                out.flush();
                return;
            }

            // Fallback full GET when clen query param is absent
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(streamUrl).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(120000);
                conn.setInstanceFollowRedirects(true);
                if (userAgent != null && !userAgent.isEmpty()) {
                    conn.setRequestProperty("User-Agent", userAgent);
                }
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    throw new Exception("Upstream HTTP " + code);
                }
                long cl = conn.getContentLengthLong();
                try (InputStream in = conn.getInputStream()) {
                    int len;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                        received += len;
                        if (listener != null) listener.onBytes(received, cl > 0 ? cl : 0L);
                    }
                }
                out.flush();
            } finally {
                if (conn != null) conn.disconnect();
            }
        }
    }

    private void muxVideoAndAudio(String videoPath, String audioPath, String outputPath) throws Exception {
        MediaExtractor videoExtractor = new MediaExtractor();
        MediaExtractor audioExtractor = new MediaExtractor();
        MediaMuxer muxer = null;
        boolean started = false;

        try {
            videoExtractor.setDataSource(videoPath);
            audioExtractor.setDataSource(audioPath);

            int videoTrackIndex = findFirstTrack(videoExtractor, "video/");
            int audioTrackIndex = findFirstTrack(audioExtractor, "audio/");
            if (videoTrackIndex < 0) throw new Exception("No video track found in stream");
            if (audioTrackIndex < 0) throw new Exception("No audio track found in stream");

            videoExtractor.selectTrack(videoTrackIndex);
            audioExtractor.selectTrack(audioTrackIndex);

            MediaFormat videoFormat = videoExtractor.getTrackFormat(videoTrackIndex);
            MediaFormat audioFormat = audioExtractor.getTrackFormat(audioTrackIndex);

            muxer = new MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            int muxVideoTrack = muxer.addTrack(videoFormat);
            int muxAudioTrack = muxer.addTrack(audioFormat);

            int maxInputSize = 2 * 1024 * 1024;
            if (videoFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                maxInputSize = Math.max(maxInputSize, videoFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE));
            }
            if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                maxInputSize = Math.max(maxInputSize, audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE));
            }

            ByteBuffer buffer = ByteBuffer.allocate(maxInputSize);
            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();

            muxer.start();
            started = true;

            // Write video samples
            while (true) {
                buffer.clear();
                int sampleSize = videoExtractor.readSampleData(buffer, 0);
                if (sampleSize < 0) break;

                bufferInfo.offset = 0;
                bufferInfo.size = sampleSize;
                bufferInfo.presentationTimeUs = Math.max(0L, videoExtractor.getSampleTime());
                int flags = videoExtractor.getSampleFlags();
                bufferInfo.flags = (flags & MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0;

                muxer.writeSampleData(muxVideoTrack, buffer, bufferInfo);
                videoExtractor.advance();
            }

            emitProgress("muxing", 91, "Finalizing audio track in MP4...");

            // Write audio samples
            while (true) {
                buffer.clear();
                int sampleSize = audioExtractor.readSampleData(buffer, 0);
                if (sampleSize < 0) break;

                bufferInfo.offset = 0;
                bufferInfo.size = sampleSize;
                bufferInfo.presentationTimeUs = Math.max(0L, audioExtractor.getSampleTime());
                int flags = audioExtractor.getSampleFlags();
                bufferInfo.flags = (flags & MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0;

                muxer.writeSampleData(muxAudioTrack, buffer, bufferInfo);
                audioExtractor.advance();
            }
        } finally {
            try {
                if (muxer != null) {
                    if (started) muxer.stop();
                    muxer.release();
                }
            } catch (Exception ignored) {}
            try {
                videoExtractor.release();
            } catch (Exception ignored) {}
            try {
                audioExtractor.release();
            } catch (Exception ignored) {}
        }
    }

    private int findFirstTrack(MediaExtractor extractor, String mimePrefix) {
        int count = extractor.getTrackCount();
        for (int i = 0; i < count; i++) {
            MediaFormat format = extractor.getTrackFormat(i);
            String mime = format.getString(MediaFormat.KEY_MIME);
            if (mime != null && mime.startsWith(mimePrefix)) {
                return i;
            }
        }
        return -1;
    }

    private void saveToPublicDownloads(Context context, File sourceFile, String fileName, String mimeType) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ByteMusic");
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (itemUri == null) throw new Exception("Failed to create Downloads entry");

            try (InputStream in = new FileInputStream(sourceFile);
                 OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) throw new Exception("Failed to open output stream for Downloads");
                byte[] buf = new byte[64 * 1024];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
            }

            ContentValues finish = new ContentValues();
            finish.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(itemUri, finish, null, null);
        } else {
            File downloadsRoot = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File targetDir = new File(downloadsRoot, "ByteMusic");
            if (!targetDir.exists()) targetDir.mkdirs();
            File dest = new File(targetDir, fileName);

            try (InputStream in = new FileInputStream(sourceFile);
                 OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[64 * 1024];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
            }
            MediaScannerConnection.scanFile(context, new String[]{dest.getAbsolutePath()}, new String[]{mimeType}, null);
        }
    }

    private void postCompletedNotification(Context context, String title, String qualityLabel, String fileName) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    DOWNLOAD_CHANNEL_ID,
                    "Video Downloads",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                nm.createNotificationChannel(channel);
            }
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, DOWNLOAD_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle(title + " (" + qualityLabel + ")")
                .setContentText("Saved to Downloads/ByteMusic/" + fileName)
                .setAutoCancel(true);
            nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
        } catch (Exception ignored) {}
    }

    private void emitProgress(String stage, int progress, String message) {
        JSObject payload = new JSObject();
        payload.put("stage", stage);
        payload.put("progress", progress);
        payload.put("message", message);
        notifyListeners("downloadProgress", payload);
    }

    private String sanitizeFileName(String name) {
        String clean = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "_").trim();
        if (clean.isEmpty()) return "ByteMusic_Video.mp4";
        if (clean.length() > 110) {
            int dot = clean.lastIndexOf('.');
            String ext = dot > 0 ? clean.substring(dot) : ".mp4";
            clean = clean.substring(0, 100) + ext;
        }
        return clean;
    }
}
