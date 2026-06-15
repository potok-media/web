import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getFileExtension, normalizeStreamUrlToPath, getProxyUrl, updateStreamUrlParams } from "../utils/playerHelpers";
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
}: HlsPlayerParams) {
  const hlsRef = useRef<Hls | null>(null);
  const playerSessionRef = useRef<number>(0);
  const autoRefreshCountRef = useRef<number>(0);
  const [srcResetCounter, setSrcResetCounter] = useState(0);

  // Quality levels state
  const [rawLevels, setRawLevels] = useState<{ id: number; height?: number }[]>([]);
  const [hlsActiveLevel, setHlsActiveLevel] = useState(-1);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  const handleRefreshStreamRef = useRef(handleRefreshStream);
  useEffect(() => {
    handleRefreshStreamRef.current = handleRefreshStream;
  }, [handleRefreshStream]);

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

    // Parse starting position for native resume
    let startPos = 0;
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

    const normalizedUrl = normalizeStreamUrlToPath(playback.streamUrl);
    const isStreamServer = normalizedUrl.includes("/stream/") || normalizedUrl.includes("/torrents/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd", "m4v"].includes(ext) : false;
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

    let finalStreamUrl = normalizedUrl;
    const needsRemux = isStreamServer && (isNonNative || currentAudioTrack > 0 || playback.streamUrl.includes("remux=true") || normalizedUrl.includes("remux=true"));
    if (needsRemux) {
      finalStreamUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(startPos).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : "0"
      });
      setSeekOffset(startPos);
    } else {
      setSeekOffset(0);
      if (isStreamServer) {
        try {
          const parsed = new URL(normalizedUrl);
          parsed.searchParams.delete("remux");
          parsed.searchParams.delete("start");
          parsed.searchParams.delete("audio");
          finalStreamUrl = parsed.toString();
        } catch {
          finalStreamUrl = normalizedUrl.split("?")[0];
        }
      }
    }

    const gatewayBase = ApiClient.baseURL;
    const proxiedUrl = getProxyUrl(finalStreamUrl, gatewayBase, playback.headers);

    const isM3U8 = normalizedUrl.includes(".m3u8") || normalizedUrl.includes("/hls/");

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startPosition: startPos > 0 ? startPos : -1,
      });
      hlsRef.current = hls;

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
        syncNativeTextTracks(video);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
        setCurrentQualityLevel(data.level);
        setHlsActiveLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
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
        syncNativeTextTracks(video);
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
  }, [playback.streamUrl, currentAudioTrack, cleanupActiveResources, syncNativeTextTracks, setPlayerError, setIsMetadataLoading, setSeekOffset]);

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
