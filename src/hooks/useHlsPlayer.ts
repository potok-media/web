import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { logger } from "../utils/logger";
import { createHlsPlayerConfig } from "../utils/hls/hlsConfig";
import { bindHlsEventHandlers } from "../utils/hls/hlsEventHandlers";
import { matchAudioTrack } from "../utils/hls/audioPreference";
import {
  getPlaybackResumePosition,
  getUnsupportedNativeFormatError,
  isHlsPlayback,
  isSmartTVUserAgent,
  teardownVideoAndHls,
} from "../utils/hls/hlsPlaybackUtils";
import type { HlsPlayerParams } from "../utils/hls/hlsPlayerTypes";

export type { HlsPlayerParams } from "../utils/hls/hlsPlayerTypes";

export function useHlsPlayer({
  videoRef,
  playback,
  setCurrentAudioTrack,
  setAudioTracks,
  preferredAudioRef,
  syncNativeTextTracks,
  setSeekOffset,
  setPlayerError,
  setIsMetadataLoading,
}: HlsPlayerParams) {
  const hlsRef = useRef<Hls | null>(null);
  const playerSessionRef = useRef(0);
  const autoRefreshCountRef = useRef(0);
  const [srcResetCounter, setSrcResetCounter] = useState(0);

  const syncNativeTextTracksRef = useRef(syncNativeTextTracks);
  syncNativeTextTracksRef.current = syncNativeTextTracks;

  const [rawLevels, setRawLevels] = useState<{ id: number; height?: number }[]>([]);
  const [hlsActiveLevel, setHlsActiveLevel] = useState(-1);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  const bumpSession = useCallback(() => {
    playerSessionRef.current += 1;
  }, []);

  const cleanupActiveResources = useCallback(() => {
    teardownVideoAndHls(videoRef, hlsRef, bumpSession);
  }, [videoRef, bumpSession]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    cleanupActiveResources();
    const sessionId = playerSessionRef.current;

    setPlayerError(null);
    setIsMetadataLoading(true);
    setSrcResetCounter((p) => p + 1);

    const audioUrl = playback.streamUrl;
    const isHls = isHlsPlayback(playback, audioUrl);

    if (!isHls && !isSmartTVUserAgent()) {
      const formatError = getUnsupportedNativeFormatError(audioUrl);
      if (formatError) {
        setPlayerError(formatError);
        setIsMetadataLoading(false);
        return;
      }
    }

    const startPos = getPlaybackResumePosition(playback);
    setSeekOffset(0);

    const sessionRefs = { hlsRef, playerSessionRef, syncNativeTextTracksRef };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls(createHlsPlayerConfig(startPos));
      hlsRef.current = hls;

      bindHlsEventHandlers(hls, video, sessionId, sessionRefs, {
        setAudioTracks,
        setCurrentAudioTrack,
        setRawLevels,
        setCurrentQualityLevel,
        setHlsActiveLevel,
        setIsMetadataLoading,
        setPlayerError,
        getPreferredAudioTrackId: (rawTracks) => {
          const pref = preferredAudioRef.current;
          return pref ? matchAudioTrack(rawTracks, pref) : -1;
        },
      });

      hls.loadSource(audioUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
        cleanupActiveResources();
      };
    }

    video.setAttribute("crossorigin", "anonymous");
    video.src = audioUrl;

    const handleLoadedMetadata = () => {
      if (playerSessionRef.current !== sessionId) return;
      if (startPos > 0) {
        video.currentTime = startPos;
      }
      setIsMetadataLoading(false);
      syncNativeTextTracksRef.current(video);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.play().catch(() => {
      video.muted = true;
      video.play().catch((err) => logger.error("[useHlsPlayer] Autoplay failed:", err));
    });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      cleanupActiveResources();
    };
  }, [
    playback,
    cleanupActiveResources,
    setPlayerError,
    setIsMetadataLoading,
    setSeekOffset,
    setAudioTracks,
    setCurrentAudioTrack,
    preferredAudioRef,
    videoRef,
  ]);

  return {
    hlsRef,
    srcResetCounter,
    setSrcResetCounter,
    rawLevels,
    setRawLevels,
    hlsActiveLevel,
    setHlsActiveLevel,
    currentQualityLevel,
    setCurrentQualityLevel,
    autoRefreshCountRef,
    cleanupActiveResources,
  };
}