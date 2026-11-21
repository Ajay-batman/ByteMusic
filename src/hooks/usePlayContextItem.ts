import { useMemo, useCallback } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { PlayContextItemOptions, PlayContextItemReturn } from '../types/spotify';
import { mockTracks } from '../data/mockSpotifyCatalog';

/**
 * usePlayContextItem
 * Reconstructed from Spotify's internal player hook: (0, ep.P)({ uri }, { featureIdentifier })
 * Adheres to REA Obligation ID: spotify.player.state-machine
 */
export function usePlayContextItem(
  item: PlayContextItemOptions,
  context?: { featureIdentifier?: string; referrerIdentifier?: string }
): PlayContextItemReturn {
  const { currentTrack, isPlaying, isLoading, playTrack, togglePlay: ctxTogglePlay } = usePlayback();

  const isActive = useMemo(() => {
    return currentTrack?.uri === item.uri || (Boolean(item.track) && currentTrack?.id === item.track?.id);
  }, [currentTrack, item.uri, item.track]);

  const triggerPlay = useCallback(
    (_options?: { loggingParams?: unknown }) => {
      // Find track matching item.uri or use direct item.track
      const track = item.track || mockTracks.find((t) => t.uri === item.uri);
      if (track) {
        playTrack(track, item.queue);
      }
    },
    [item.uri, item.track, item.queue, playTrack]
  );

  const togglePlay = useCallback(
    (_options?: { loggingParams?: unknown }) => {
      if (isActive) {
        ctxTogglePlay();
      } else {
        triggerPlay();
      }
    },
    [isActive, ctxTogglePlay, triggerPlay]
  );

  return {
    isActive,
    isPlaying: isActive && isPlaying,
    isLoading: isActive && isLoading,
    triggerPlay,
    togglePlay,
  };
}
