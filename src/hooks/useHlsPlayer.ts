import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getFileExtension, updateStreamUrlParams, normalizeStreamUrlToPath, getProxyUrl, getHlsStreamUrl } from "../utils/playerHelpers";
import { ApiClient } from "../network/ApiClient";
import type { ActivePlayback } from "../context/AppSettingsContext";

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
}

export function useHlsPlayer({
  videoRef,
  playback,
  currentAudioTrack,
  setCurrentAudioTrack,
  setAudioTracks,
  syncNativeTextTracks,
  setSeekOffset,
  setPlayerError,
  handleRefreshStream,
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
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.error("[useHlsPlayer] Hls destroy error:", e);
      }
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
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
    const isStreamServer = normalizedUrl.includes("/stream") || normalizedUrl.includes("/torrents/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd"].includes(ext) : false;
    const needsRemux = isStreamServer && (isNonNative || (currentAudioTrack !== -1 && currentAudioTrack > 0));

    let finalStreamUrl = normalizedUrl;
    if (needsRemux) {
      finalStreamUrl = getHlsStreamUrl(normalizedUrl);
      finalStreamUrl = updateStreamUrlParams(finalStreamUrl, {
        start: Math.floor(startPos).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : "0"
      });
    }
    setSeekOffset(needsRemux ? startPos : 0);

    const gatewayBase = ApiClient.baseURL;
    const proxiedUrl = getProxyUrl(finalStreamUrl, gatewayBase, playback.headers);
    const isM3u8 = finalStreamUrl.includes(".m3u8");

    setPlayerError(null);

    if (isM3u8) {
      video.crossOrigin = "anonymous";
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;

        if (startPos > 0) {
          hls.config.startPosition = startPos;
        }

        const updateAudioTracks = () => {
          if (playerSessionRef.current !== sessionId) return;
          if (playback.audios && playback.audios.length > 0 && (!hls.audioTracks || hls.audioTracks.length <= 1)) {
            return;
          }
          const audios = (hls.audioTracks || []).map((t, idx) => {
            let name = t.name || `Дорожка ${idx + 1}`;
            if (playback.audios && playback.audios[idx]) {
              name = playback.audios[idx].name;
            } else if (playback.audioNames && playback.audioNames[idx]) {
              name = playback.audioNames[idx];
            }
            return { id: idx, name };
          });
          setAudioTracks(audios);
          setCurrentAudioTrack(hls.audioTrack);
          syncNativeTextTracks(video);
        };

        const updateQualityLevels = () => {
          if (playerSessionRef.current !== sessionId) return;
          const levels = hls.levels || [];
          setRawLevels(levels.map((l, idx) => ({ id: idx, height: l.height })));
          setCurrentQualityLevel(hls.autoLevelEnabled ? -1 : hls.currentLevel);
          setHlsActiveLevel(hls.currentLevel);
        };

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          updateAudioTracks();
          updateQualityLevels();
          video.play().catch(() => {
            video.muted = true;
            video.play().catch((err) => console.error("Autoplay failed:", err));
          });
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, updateAudioTracks);
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => syncNativeTextTracks(video));
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
          if (playerSessionRef.current !== sessionId) return;
          setCurrentAudioTrack(hls.audioTrack);
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          if (playerSessionRef.current !== sessionId) return;
          setHlsActiveLevel(data.level);
          setCurrentQualityLevel(hls.autoLevelEnabled ? -1 : data.level);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (playerSessionRef.current !== sessionId) return;
          if (data.fatal) {
            const responseCode = (data.response as any)?.code;
            if (responseCode === 403 || responseCode === 401) {
              hls.stopLoad();
              setPlayerError("Доступ к воспроизведению ограничен.");
              return;
            }
            if (responseCode === 410) {
              hls.stopLoad();
              if (playback.providerId && autoRefreshCountRef.current < 1) {
                autoRefreshCountRef.current += 1;
                console.log("[useHlsPlayer] Fatal HLS 410 error. Refreshing stream...");
                handleRefreshStreamRef.current();
              } else {
                setPlayerError("Срок действия ссылки на поток истек.");
              }
              return;
            }
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          }
        });

        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        setSrcResetCounter((p) => p + 1);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxiedUrl;
        setSrcResetCounter((p) => p + 1);
        video.play().then(() => {
          if (startPos > 0) {
            video.currentTime = startPos;
          }
        }).catch(() => {});
      }
    } else {
      video.setAttribute("crossorigin", "anonymous");
      video.src = proxiedUrl;
      setSrcResetCounter((p) => p + 1);
      video.play().then(() => {
        if (startPos > 0 && !needsRemux) {
          video.currentTime = startPos;
        }
      }).catch(() => {
        video.muted = true;
        video.play().then(() => {
          if (startPos > 0 && !needsRemux) {
            video.currentTime = startPos;
          }
        }).catch((err) => console.error("Autoplay failed:", err));
      });
    }

    return () => {
      cleanupActiveResources();
    };
  }, [playback.streamUrl, cleanupActiveResources, syncNativeTextTracks]);

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
