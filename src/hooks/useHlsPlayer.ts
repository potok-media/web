import { useEffect, useRef, useState, useCallback } from "react";
import { getFileExtension, normalizeStreamUrlToPath, getProxyUrl, updateStreamUrlParams } from "../utils/playerHelpers";
import { ApiClient } from "../network/ApiClient";
import { type ActivePlayback } from "../context/AppSettingsContext";

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
  // Keeping refs and states to match the previous interface to prevent compilation errors
  const hlsRef = useRef<any>(null);
  const playerSessionRef = useRef<number>(0);
  const autoRefreshCountRef = useRef<number>(0);
  const [srcResetCounter, setSrcResetCounter] = useState(0);

  // Quality levels state (mocked/unused since Hls is removed)
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
        console.error("[useHlsPlayer] Video teardown error:", e);
      }
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
    if (isStreamServer) {
      finalStreamUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(startPos).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : "0"
      });
      setSeekOffset(startPos);
    } else {
      setSeekOffset(0);
    }

    const gatewayBase = ApiClient.baseURL;
    const proxiedUrl = getProxyUrl(finalStreamUrl, gatewayBase, playback.headers);

    video.setAttribute("crossorigin", "anonymous");
    video.src = proxiedUrl;
    setSrcResetCounter((p) => p + 1);

    const handleLoadedMetadata = () => {
      if (playerSessionRef.current !== sessionId) return;
      if (!isStreamServer && startPos > 0) {
        video.currentTime = startPos;
      }
      setIsMetadataLoading(false);
      syncNativeTextTracks(video);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    video.play().catch(() => {
      video.muted = true;
      video.play().catch((err) => console.error("[useHlsPlayer] Autoplay failed:", err));
    });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      cleanupActiveResources();
    };
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
