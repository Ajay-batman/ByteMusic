import React from 'react';
import { Track } from '../../types/spotify';
import { useDownload } from '../../context/DownloadContext';
import { ArrowDownCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface DownloadButtonProps {
  track: Track;
  size?: number;
  className?: string;
  showText?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  track,
  size = 20,
  className = '',
  showText = false,
}) => {
  const { isDownloaded, isDownloading, downloadTrack, removeDownload } = useDownload();

  const downloaded = isDownloaded(track.id);
  const downloading = isDownloading(track.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    if (downloaded) {
      removeDownload(track);
    } else {
      downloadTrack(track);
    }
  };

  if (downloading) {
    return (
      <button
        onClick={handleClick}
        disabled
        title="Downloading audio..."
        aria-label="Downloading track"
        className={`inline-flex items-center gap-1.5 transition-transform p-1 text-[#1db954] cursor-wait ${className}`}
      >
        <Loader2 size={size} className="animate-spin" />
        {showText && <span className="text-xs font-medium text-[#1db954]">Downloading...</span>}
      </button>
    );
  }

  if (downloaded) {
    return (
      <button
        onClick={handleClick}
        title="Downloaded for offline • Tap to remove"
        aria-label="Remove download"
        className={`inline-flex items-center gap-1.5 transition-transform hover:scale-110 p-1 text-[#1db954] ${className}`}
      >
        <CheckCircle2 size={size} className="fill-[#1db954]/20 text-[#1db954]" />
        {showText && <span className="text-xs font-medium text-[#1db954]">Downloaded</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title="Download song to device & offline"
      aria-label="Download song"
      className={`inline-flex items-center gap-1.5 transition-transform hover:scale-110 p-1 text-[#b3b3b3] hover:text-white ${className}`}
    >
      <ArrowDownCircle size={size} />
      {showText && <span className="text-xs font-medium">Download</span>}
    </button>
  );
};
