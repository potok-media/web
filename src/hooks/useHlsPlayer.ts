import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getProxyUrl } from "../utils/playerHelpers";
import { describeStream, streamNeedsRemux, stripRemuxParams, buildHlsUrl } from "../utils/torrentGoStream";
import { ApiClient } from "../network/ApiClient";
import { type ActivePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";

interface HlsPlayerParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playback: ActivePlayback;
  currentAudioTrack: number;
  setCurrentAudioTrack: (id: number) => void;
  setAudioTracks: (tracks: any[]) => void;
  syncNativeTextTracks: (video: HTMLVideoElement | null) => void;
  setSeekOffset: (offset: number) => void;
  setPlayerError: (error: string | null) => void;
  handleRefreshStream: () => void;
  setIsMetadataLoading: (loading: boolean) => void;
  hlsAudio?: number; // explicit HLS audio-track override (undefined = server default first track)
}

export function useHlsPlayer({
  videoRef,
  playback,
  currentAudioTrack,
  setCurrentAudioTrack: _setCurrentAudioTrack,
  setAudioTracks: _setAudioTracks,
  syncNativeTextTracks,
  setSeekOffset,
  setPlayerError,
  handleRefreshStream,
  setIsMetadataLoading,
  hlsAudio,
}: HlsPlayerParams) {
  const hlsRef = useRef<Hls | null>(null);
  const playerSessionRef = useRef<number>(0);
  const autoRefreshCountRef = useRef<number>(0);
  const [srcResetCounter, setSrcResetCounter] = useState(0);

  // Latest Ref Pattern for syncNativeTextTracks to avoid teardown loops
  const syncNativeTextTracksRef = useRef(syncNativeTextTracks);
  syncNativeTextTracksRef.current = syncNativeTextTracks;

  // Quality levels state
  const [rawLevels, setRawLevels] = useState<{ id: number; height?: number }[]>([]);
  const [hlsActiveLevel, setHlsActiveLevel] = useState(-1);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  const handleRefreshStreamRef = useRef(handleRefreshStream);
  useEffect(() => {
    handleRefreshStreamRef.current = handleRefreshStream;
  }, [handleRefreshStream]);

  // Synchronously update HLS audio track without reloading player
  useEffect(() => {
    if (hlsRef.current && currentAudioTrack !== -1) {
      if (hlsRef.current.audioTrack !== currentAudioTrack) {
        hlsRef.current.audioTrack = currentAudioTrack;
      }
    }
  }, [currentAudioTrack]);

  const cleanupActiveResources = useCallback(() => {
    playerSessionRef.current += 1;
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.src = "";
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        logger.error("[useHlsPlayer] Video teardown error:", e);
      }
    }
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        logger.error("[useHlsPlayer] Hls destroy error:", e);
      }
      hlsRef.current = null;
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    cleanupActiveResources();
    const sessionId = playerSessionRef.current;

    const info = describeStream(playback.streamUrl, { streamHash: playback.streamHash, torrentHash: (playback as any).torrentHash });
    const { normalizedUrl, isTorrentGoStream: isStreamServer, ext, isNonNative } = info;
    const isSmartTV = /web0s|webos|tizen|smarttv|smart-tv|lg|samsung/i.test(navigator.userAgent);

    setPlayerError(null);

    // If format is not natively supported by the browser and we cannot remux it on the server, block playback
    if (isNonNative && !isStreamServer && !isSmartTV) {
      setPlayerError(
        `Формат файла (${ext ? "." + ext : "видео"}) не поддерживается вашим браузером. Пожалуйста, откройте видео во внешнем плеере (VLC, Infuse) или воспользуйтесь Smart TV.`
      );
      setIsMetadataLoading(false);
      return;
    }

    const needsRemux = streamNeedsRemux(info, playback.streamUrl, currentAudioTrack);

    // Resume position. The TorrentGo playlist is a fully-seekable VOD and native files are seekable
    // too, so in both cases we just seek the player to the saved position (currentTime is absolute).
    let startPos = 0;
    {
      const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
      const savedResume = localStorage.getItem(resumeKey);
      if (savedResume) {
        const parsed = Number(savedResume);
        if (!isNaN(parsed) && parsed > 0) startPos = parsed;
      } else {
        try {
          const startParam = new URL(playback.streamUrl).searchParams.get("start");
          if (startParam) startPos = Number(startParam);
        } catch {
          const match = playback.streamUrl.match(/[?&]start=(\d+)/i);
          if (match) startPos = Number(match[1]);
        }
      }
    }

    // VOD HLS and native files both use an absolute whole-file timeline → no seek offset ever.
    setSeekOffset(0);
    let finalStreamUrl = normalizedUrl;
    if (needsRemux) {
      finalStreamUrl = buildHlsUrl(playback.streamUrl, { streamHash: playback.streamHash, audioTrackId: hlsAudio });
    } else if (isStreamServer) {
      finalStreamUrl = stripRemuxParams(normalizedUrl);
    }

    const gatewayBase = ApiClient.baseURL;
    const proxiedUrl = getProxyUrl(finalStreamUrl, gatewayBase, playback.headers);

    const isM3U8 = finalStreamUrl.includes(".m3u8") || finalStreamUrl.includes("/hls/");

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        // VOD delivery — buffer far ahead so network dips don't stall playback. lowLatencyMode must
        // stay OFF (it shrinks the buffer).
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        backBufferLength: 30,
        maxBufferHole: 0.5,
        // A cold segment after a deep seek may need the server to reposition ffmpeg + fetch torrent
        // pieces before it can answer — give it generous time so it doesn't fail fatally.
        fragLoadingTimeOut: 60000,
        // Be more persistent recovering from a transient buffer stall before giving up (gap-jump).
        nudgeMaxRetry: 8,
        startPosition: startPos > 0 ? startPos : -1,
      });
      hlsRef.current = hls;

      // [HLS-DIAG] Temporary instrumentation for the post-seek / post-audio-switch segment-loading
      // regression. Logs via logger.warn so entries also land in the in-app history buffer
      // (retrievable on-device where the browser console isn't reachable). Remove after diagnosis.
      logger.warn("[HLS-DIAG] init", { version: Hls.version, audioTrack: hlsAudio });
      hls.on(Hls.Events.FRAG_LOADING, (_e, data) => {
        logger.warn("[HLS-DIAG] FRAG_LOADING", { sn: data.frag.sn, url: data.frag.url });
      });
      hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
        const st: any = data.frag.stats;
        const ms = st?.loading ? Math.round(st.loading.end - st.loading.start) : -1;
        logger.warn("[HLS-DIAG] FRAG_LOADED", { sn: data.frag.sn, ms });
      });
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        const b = video.buffered;
        const end = b.length ? b.end(b.length - 1) : 0;
        logger.warn("[HLS-DIAG] BUFFER_APPENDED", { bufferEnd: Number(end.toFixed(2)), curr: Number(video.currentTime.toFixed(2)) });
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, data: any) => {
        logger.warn("[HLS-DIAG] AUDIO_TRACKS_UPDATED", { count: data.audioTracks?.length });
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, (_e, data: any) => {
        logger.warn("[HLS-DIAG] AUDIO_TRACK_SWITCHING", { id: data.id });
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data: any) => {
        logger.warn("[HLS-DIAG] AUDIO_TRACK_SWITCHED", { id: data.id });
      });

      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playerSessionRef.current !== sessionId) return;

        // Set quality levels
        const levels = hls.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
        }));
        setRawLevels(levels);
        setCurrentQualityLevel(hls.currentLevel);
        setHlsActiveLevel(hls.currentLevel);

        // Set HLS audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((t) => ({
            id: t.id,
            name: t.name || t.lang || `Дорожка ${t.id + 1}`,
            lang: t.lang,
          }));
          _setAudioTracks(tracks);
          
          if (currentAudioTrack !== -1) {
            hls.audioTrack = currentAudioTrack;
          }
        }

        setIsMetadataLoading(false);
        syncNativeTextTracksRef.current(video);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
        setCurrentQualityLevel(data.level);
        setHlsActiveLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
        // [HLS-DIAG] log every error (fatal or not) with frag + audio-track context. Remove after diagnosis.
        logger.warn("[HLS-DIAG] ERROR", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          code: (data as any).response?.code,
          sn: (data as any).frag?.sn,
          url: (data as any).frag?.url,
          audioTracks: hls.audioTracks?.length,
          audioTrack: hls.audioTrack,
        });
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              logger.warn("[useHlsPlayer] Hls network error, retrying...", data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              logger.warn("[useHlsPlayer] Hls media error, recovering...", data);
              hls.recoverMediaError();
              break;
            default:
              logger.error("[useHlsPlayer] Fatal Hls error:", data);
              setPlayerError("Ошибка при воспроизведении HLS потока.");
              setIsMetadataLoading(false);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
        cleanupActiveResources();
      };
    } else {
      // Native progressive / native HLS (e.g. Safari)
      video.setAttribute("crossorigin", "anonymous");
      video.src = proxiedUrl;
      setSrcResetCounter((p) => p + 1);

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
    }
  }, [playback.streamUrl, hlsAudio, cleanupActiveResources, setPlayerError, setIsMetadataLoading, setSeekOffset]);

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
