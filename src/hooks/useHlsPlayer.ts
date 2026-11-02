import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { logger } from "../utils/logger";
import { i18n } from "../i18n";
import { startMediaPlayback, isAbortError } from "../utils/mediaPlayback";
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
import { getPlaybackPipelineKey } from "../utils/playbackTransitions";

export type { HlsPlayerParams } from "../utils/hls/hlsPlayerTypes";

export function useHlsPlayer({
  videoRef,
  videoNode,
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
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const pipelineKey = getPlaybackPipelineKey(playback);

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
    const video = videoNode !== undefined ? videoNode : videoRef.current;
    if (!video) return;
    const pipelinePlayback = playbackRef.current;

    cleanupActiveResources();
    const sessionId = playerSessionRef.current;

    setPlayerError(null);
    setIsMetadataLoading(true);
    setSrcResetCounter((p) => p + 1);

    const audioUrl = pipelinePlayback.streamUrl;
    const isHls = isHlsPlayback(pipelinePlayback, audioUrl);

    if (!isHls && !isSmartTVUserAgent()) {
      const formatError = getUnsupportedNativeFormatError(audioUrl);
      if (formatError) {
        setPlayerError(formatError);
        setIsMetadataLoading(false);
        return;
      }
    }

    const startPos = getPlaybackResumePosition(pipelinePlayback);
    setSeekOffset(0);

    const sessionRefs = { hlsRef, playerSessionRef, syncNativeTextTracksRef };

    const startPlayback = (source: "hls" | "native") => {
      void startMediaPlayback(video).then((result) => {
        if (result.started || playerSessionRef.current !== sessionId) return;
        if (isAbortError(result.error)) {
          // The co-watch start gate paused the element mid-play() on episode switch — the gate effect
          // re-starts playback when it opens. Surfacing this as an error would flash a false overlay.
          logger.log(`[useHlsPlayer] ${source} play() aborted by pause (co-watch gate hold) — ignoring`);
          return;
        }
        logger.error(`[useHlsPlayer] ${source} playback start failed:`, result.error, {
          readyState: video.readyState,
          networkState: video.networkState,
          mediaError: video.error?.code ?? null,
        });
        setPlayerError(i18n.t("player:playback.loadFailed"));
        setIsMetadataLoading(false);
      });
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls(createHlsPlayerConfig(startPos, pipelinePlayback.headers));
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
        manageHlsAudioTracks: !pipelinePlayback.audios?.length,
      });

      const startHlsPlayback = () => startPlayback("hls");
      // A co-watch guest starts only after the host releases the ready gate. Solo HLS playback still needs an
      // explicit play request: relying on the autoPlay attribute alone leaves policy failures invisible.
      if (!pipelinePlayback.coWatch) hls.on(Hls.Events.MANIFEST_PARSED, startHlsPlayback);

      hls.loadSource(audioUrl);
      hls.attachMedia(video);

      return () => {
        hls.off(Hls.Events.MANIFEST_PARSED, startHlsPlayback);
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
    // Co-watch starts only from the host's sync release. Starting native media here would bypass the same
    // ready gate that HLS guests obey and let the guest run while the host is still holding everyone paused.
    if (!pipelinePlayback.coWatch) startPlayback("native");

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      cleanupActiveResources();
    };
  }, [
    pipelineKey,
    videoNode,
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
