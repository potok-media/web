import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { ApiClient } from "../network/ApiClient";
import { usePlayback, type ActivePlayback } from "../context/AppSettingsContext";
import { PlayerTopBar } from "./player/PlayerTopBar";
import { PlayerStatsHUD } from "./player/PlayerStatsHUD";
import { PlayerControls } from "./player/PlayerControls";
import { loadExternalSubtitle } from "../utils/SubtitleHelper";
import { useTimecodes } from "../hooks/useTimecodes";
import { usePlaybackTracker } from "../hooks/usePlaybackTracker";

// Helper to extract file extension from stream URL dynamically
const getFileExtension = (url: string): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) {
      return pathname.slice(lastDot + 1).toLowerCase();
    }
  } catch {
    const cleanUrl = url.split("?")[0];
    const lastDot = cleanUrl.lastIndexOf(".");
    if (lastDot !== -1) {
      return cleanUrl.slice(lastDot + 1).toLowerCase();
    }
  }
  return "";
};
// Helper to safely preserve and update query parameters in a stream URL
const updateStreamUrlParams = (url: string, params: { remux?: string; start?: string; audio?: string }): string => {
  try {
    const parsed = new URL(url);
    if (params.remux !== undefined) parsed.searchParams.set("remux", params.remux);
    if (params.start !== undefined) parsed.searchParams.set("start", params.start);
    if (params.audio !== undefined) {
      if (params.audio) parsed.searchParams.set("audio", params.audio);
      else parsed.searchParams.delete("audio");
    }
    return parsed.toString();
  } catch {
    const baseUrl = url.split("?")[0];
    const queryParts: string[] = [];
    if (params.remux) queryParts.push(`remux=${params.remux}`);
    if (params.start) queryParts.push(`start=${params.start}`);
    if (params.audio) queryParts.push(`audio=${params.audio}`);
    return queryParts.length > 0 ? `${baseUrl}?${queryParts.join("&")}` : baseUrl;
  }
};
// Helper to normalize the stream URL to path-based format for robust player remuxing and seeking
const normalizeStreamUrlToPath = (url: string): string => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const linkParam = parsed.searchParams.get("link");
    const indexParam = parsed.searchParams.get("index");
    if (linkParam && indexParam) {
      const baseUrl = url.split("/stream/")[0];
      const filename = parsed.pathname.split("/").pop() || "video.mkv";
      return `${baseUrl}/stream/${linkParam.toLowerCase()}/${indexParam}/${filename}`;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return url;
};

interface SkipIntroButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  seekOffset: number;
  introRange: { start: number; end: number } | null | undefined;
  displayDuration: number;
  onSeek: (time: number) => void;
}

const SkipIntroButton: React.FC<SkipIntroButtonProps> = ({
  videoRef,
  seekOffset,
  introRange,
  displayDuration,
  onSeek,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !introRange) {
      setVisible(false);
      return;
    }

    const checkVisibility = () => {
      const displayCurrentTime = seekOffset > 0 ? (seekOffset + video.currentTime) : video.currentTime;
      const isVisible = displayCurrentTime >= introRange.start && displayCurrentTime <= introRange.end;
      setVisible(isVisible);
    };

    video.addEventListener("timeupdate", checkVisibility);
    checkVisibility();

    return () => {
      video.removeEventListener("timeupdate", checkVisibility);
    };
  }, [videoRef, seekOffset, introRange, displayDuration]);

  if (!visible || !introRange) return null;

  return (
    <button
      className="skip-intro-overlay-btn"
      onClick={(e) => {
        e.stopPropagation();
        onSeek(introRange.end);
      }}
    >
      <span>Пропустить интро</span>
      <ChevronRight size={18} />
    </button>
  );
};

interface SkipOutroButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  seekOffset: number;
  outroRange: { start: number; end?: number } | null | undefined;
  displayDuration: number;
  onSeek: (time: number) => void;
}

const SkipOutroButton: React.FC<SkipOutroButtonProps> = ({
  videoRef,
  seekOffset,
  outroRange,
  displayDuration,
  onSeek,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !outroRange) {
      setVisible(false);
      return;
    }

    const checkVisibility = () => {
      const displayCurrentTime = seekOffset > 0 ? (seekOffset + video.currentTime) : video.currentTime;
      const isVisible = displayCurrentTime >= outroRange.start && displayCurrentTime <= (outroRange.end || displayDuration);
      setVisible(isVisible);
    };

    video.addEventListener("timeupdate", checkVisibility);
    checkVisibility();

    return () => {
      video.removeEventListener("timeupdate", checkVisibility);
    };
  }, [videoRef, seekOffset, outroRange, displayDuration]);

  if (!visible || !outroRange) return null;

  return (
    <button
      className="skip-intro-overlay-btn outro-btn"
      onClick={(e) => {
        e.stopPropagation();
        onSeek(Math.min(outroRange.end || displayDuration, displayDuration - 1));
      }}
    >
      <span>Пропустить титры</span>
      <ChevronRight size={18} />
    </button>
  );
};

interface WebMediaPlayerProps {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

const subtitleObjectUrls = new Set<string>();

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = ({ playback, onClose, isNetworkOffline = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const playerSessionRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const autoRefreshCountRef = useRef<number>(0);
  const { playVideo } = usePlayback();

  // States
  const [isClosed, setIsClosed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [srcResetCounter, setSrcResetCounter] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  useEffect(() => {
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const savedResume = localStorage.getItem(resumeKey);
    if (savedResume) {
      const parsed = Number(savedResume);
      if (!isNaN(parsed) && parsed > 15) {
        setResumeTime(parsed);
        setShowResumeToast(true);
        const timer = setTimeout(() => {
          setShowResumeToast(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [playback.id, playback.season, playback.episode]);

  useEffect(() => {
    setIsClosed(false);
  }, [playback.streamUrl]);

  const handleClose = useCallback(() => {
    setIsClosed(true);
    onClose?.();
  }, [onClose]);

  // Subtitle/Track States
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [injectedSubtitles, setInjectedSubtitles] = useState<{ id: string; label: string; srclang: string; src: string }[]>([]);
  const [rawLevels, setRawLevels] = useState<{ id: number; height?: number }[]>([]);
  const [hlsActiveLevel, setHlsActiveLevel] = useState(-1);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  // Control Visibility States
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  // Virtualized Clock States
  const [isMetadataLoading, setIsMetadataLoading] = useState(() => {
    return playback.streamUrl.includes("/stream/") || !!playback.streamHash;
  });
  const [metadataDuration, setMetadataDuration] = useState(0);

  // Derived torrent/file metadata
  const streamHash = useMemo(() => {
    let hash = playback.streamHash;
    if (!hash) {
      const hashMatch = playback.streamUrl.match(/\/stream\/([a-f0-9]{40})/i);
      if (hashMatch) {
        hash = hashMatch[1];
      } else {
        try {
          const parsed = new URL(playback.streamUrl);
          hash = parsed.searchParams.get("link") || "";
        } catch {
          const match = playback.streamUrl.match(/[?&]link=([a-f0-9]{40})/i);
          if (match) hash = match[1];
        }
      }
    }
    return hash ? hash.toLowerCase() : "";
  }, [playback.streamUrl, playback.streamHash]);

  const fileIndex = useMemo(() => {
    let fileId = "";
    const pathMatch = playback.streamUrl.match(/\/stream\/[a-f0-9]+\/(\d+)/i);
    if (pathMatch) {
      fileId = pathMatch[1];
    } else {
      try {
        const parsed = new URL(playback.streamUrl);
        fileId = parsed.searchParams.get("index") || "";
      } catch {
        const match = playback.streamUrl.match(/[?&]index=(\d+)/i);
        if (match) fileId = match[1];
      }
    }
    return fileId;
  }, [playback.streamUrl]);

  // Torrent P2P loading states
  const [torrentPeers, setTorrentPeers] = useState<number | null>(null);
  const [torrentDownloadSpeed, setTorrentDownloadSpeed] = useState<number | null>(null);
  const [isMetadataFetched, setIsMetadataFetched] = useState(false);
  const [hasPositivePeersTime, setHasPositivePeersTime] = useState<number | null>(null);

  const [seekOffset, setSeekOffset] = useState(() => {
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const savedResume = localStorage.getItem(resumeKey);
    if (savedResume) {
      const parsed = Number(savedResume);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    try {
      const startParam = new URL(playback.streamUrl).searchParams.get("start");
      return startParam ? Number(startParam) : 0;
    } catch {
      const match = playback.streamUrl.match(/[?&]start=(\d+)/i);
      return match ? Number(match[1]) : 0;
    }
  });

  const seekOffsetRef = useRef(seekOffset);
  useEffect(() => {
    seekOffsetRef.current = seekOffset;
  }, [seekOffset]);

  const controlsTimeoutRef = useRef<any>(null);

  const playbackRef = useRef(playback);
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  // Helper to route external CDN streams through high-performance C# BFF stream proxy
  const getProxyUrl = useCallback((targetUrl: string) => {
    if (!targetUrl) return targetUrl;
    const apiTKey = "/api/tor" + "rent";
    if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1") || targetUrl.includes(apiTKey) || targetUrl.includes("/stream/")) {
      return targetUrl;
    }
    const gatewayBase = ApiClient.baseURL.replace(/\/+$/, "");
    let proxyUrl = `${gatewayBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;

    const currentHeaders = playbackRef.current.headers;
    if (currentHeaders) {
      if (currentHeaders["Referer"]) {
        proxyUrl += `&referer=${encodeURIComponent(currentHeaders["Referer"])}`;
      }
      if (currentHeaders["Origin"]) {
        proxyUrl += `&origin=${encodeURIComponent(currentHeaders["Origin"])}`;
      }
    }
    return proxyUrl;
  }, []);

  // Audio track initializer
  useEffect(() => {
    if (playback.audios && playback.audios.length > 0) {
      const tracks = playback.audios.map((a, idx) => ({ id: idx, name: a.name }));
      setAudioTracks(tracks);
      
      let activeIdx = 0;
      try {
        const audioParam = new URL(playback.streamUrl).searchParams.get("audio");
        if (audioParam !== null) {
          const parsed = parseInt(audioParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < playback.audios.length) activeIdx = parsed;
        }
      } catch {
        const match = playback.streamUrl.match(/[?&]audio=(\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 0 && parsed < playback.audios.length) activeIdx = parsed;
        }
      }
      setCurrentAudioTrack(activeIdx);
    }
  }, [playback.audios, playback.streamUrl]);

  // Track Synchronization Helper
  const syncNativeTextTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks: { id: number; name: string }[] = [];
    let activeIdx = -1;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        tracks.push({
          id: i,
          name: track.label || track.language || `Субтитры ${i + 1}`,
        });
        if (track.mode === "showing") activeIdx = i;
      }
    }
    setSubtitleTracks(tracks);
    setCurrentSubtitleTrack(activeIdx);
  }, []);

  // Sync with host metadata endpoint for custom Hls.js/torrent duration parameters
  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);

    if (!fileIndex || !streamHash) {
      setIsMetadataLoading(false);
      return;
    }

    let isMounted = true;
    setIsMetadataLoading(true);
    setIsMetadataFetched(false);
    
    (async () => {
      let fetchedSuccessfully = false;
      try {
        const metadata = await ApiClient.getStreamMetadata(streamHash, fileIndex);
        if (!isMounted) return;
        if (metadata && metadata.success) {
          fetchedSuccessfully = true;
          if (metadata.duration > 0) setMetadataDuration(metadata.duration);

          const torrentAudioTracks = metadata.tracks
            .filter((t) => t.type === "audio")
            .map((t) => ({ id: t.index, name: t.title }));
          
          if (torrentAudioTracks.length > 0) {
            setAudioTracks(torrentAudioTracks);
            setCurrentAudioTrack((prev) => (prev === -1 ? torrentAudioTracks[0].id : prev));
          }

          // Auto-inject external Hls subtitles
          const tracksToInject = metadata.tracks
            .filter((t) => t.type === "subtitle")
            .map((t) => {
              const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
              const srcUrl = `${cleanBase}/stream/${streamHash.toLowerCase()}/${fileIndex}/subtitles/${t.relIndex}`;
              return {
                id: `${t.relIndex}_${t.title}`,
                label: t.title,
                srclang: t.language || "custom",
                src: srcUrl,
              };
            });
          setInjectedSubtitles(tracksToInject);
          setIsMetadataFetched(true);
          
          setTimeout(() => {
            if (isMounted) syncNativeTextTracks();
          }, 400);
        }
      } catch (err) {
        console.warn("Failed to load stream metadata:", err);
      } finally {
        if (isMounted) {
          if (!fetchedSuccessfully) {
            setIsMetadataLoading(false);
          }
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [streamHash, fileIndex, syncNativeTextTracks]);



  // Torrent status polling interval during metadata loading phase and active playback
  useEffect(() => {
    if (!streamHash) {
      setTorrentPeers(null);
      setTorrentDownloadSpeed(null);
      setHasPositivePeersTime(null);
      return;
    }

    const hash = streamHash.toLowerCase();
    const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
    const statusUrl = `${cleanBase}/api/tor` + `rent/status/${hash}`;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(statusUrl, { mode: "cors" });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const peersCount = typeof data.peers === "number" ? data.peers : 0;
        const speed = typeof data.downloadSpeed === "number" ? data.downloadSpeed : 0;

        setTorrentPeers(peersCount);
        setTorrentDownloadSpeed(speed);

        if (peersCount > 0) {
          setHasPositivePeersTime(prev => prev ?? Date.now());
        } else {
          setHasPositivePeersTime(null);
        }
      } catch (err) {
        console.warn("[WebMediaPlayer] Torrent status poll failed:", err);
      }
    };

    pollStatus(); // Poll immediately
    const pollInterval = isMetadataLoading ? 2000 : 10000;
    const interval = setInterval(pollStatus, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [streamHash, isMetadataLoading]);

  // Compute active loading phase state representation
  const loadingState = useMemo(() => {
    if (!isMetadataLoading) return null;

    const isStreamServer = playback.streamUrl.includes("/stream/") || !!playback.streamHash;
    if (!isStreamServer) {
      return {
        title: "Инициализация и буферизация...",
        subtitle: "Загрузка медиа-потока",
        step: 4
      };
    }

    // Phase 1: DHT search / zero peers
    if (torrentPeers === null || torrentPeers === 0) {
      return {
        title: "Поиск раздающих...",
        subtitle: "Поиск активных пиров в сети P2P (DHT)",
        step: 1
      };
    }

    // Phase 2: Downloading headers / positive peers
    const isProbing = isMetadataFetched || (hasPositivePeersTime !== null && (Date.now() - hasPositivePeersTime > 3000));
    
    if (!isProbing) {
      const speedMb = torrentDownloadSpeed !== null ? (torrentDownloadSpeed / 1024 / 1024).toFixed(1) : "0.0";
      return {
        title: "Подготовка видео-потока...",
        subtitle: `Скачивание заголовков файла • Пиры: ${torrentPeers} • Скорость: ${speedMb} МБ/с`,
        step: 2
      };
    }

    // Phase 3: Running ffprobe metadata lookup
    if (!isMetadataFetched) {
      return {
        title: "Настройка аудио и видео...",
        subtitle: "Анализ медиа-контейнера и дорожек (ffprobe)",
        step: 3
      };
    }

    // Phase 4: Hls/Video loading data
    return {
      title: "Инициализация и буферизация...",
      subtitle: "Запуск плеера и наполнение буфера воспроизведения",
      step: 4
    };
  }, [isMetadataLoading, playback.streamUrl, playback.streamHash, torrentPeers, torrentDownloadSpeed, isMetadataFetched, hasPositivePeersTime]);

  // Гарантированная синхронизация режима субтитров с React-состоянием
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.kind === "subtitles" || track.kind === "captions") {
          track.mode = i === currentSubtitleTrack ? "showing" : "disabled";
        }
      }
    }, 100); // Небольшой таймаут, чтобы браузер успел примонтировать треки в DOM

    return () => clearTimeout(timer);
  }, [currentSubtitleTrack, injectedSubtitles, srcResetCounter]);

  // Activity Inactivity hide HUD manager
  const handleUserActivity = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
        setShowQualityMenu(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    handleUserActivity();
    return () => {
      isMountedRef.current = false;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleUserActivity]);

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch((err) => {
        console.error("[WebMediaPlayer] Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("[WebMediaPlayer] Failed to exit fullscreen:", err);
      });
    }
  }, []);

  // Synchronous Media Teardown sweep
  const cleanupActiveResources = useCallback(() => {
    playerSessionRef.current += 1;
    const session = playerSessionRef.current;
    console.log(`[WebMediaPlayer] Cleaning up session ${session}...`);

    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.error("[WebMediaPlayer] Hls destroy error:", e);
      }
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.src = "";
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        console.error("[WebMediaPlayer] Video teardown error:", e);
      }
    }

    subtitleObjectUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("[WebMediaPlayer] Failed to revoke Object URL during cleanup:", e);
      }
    });
    subtitleObjectUrls.clear();
  }, []);

  const handleRefreshStream = useCallback(() => {
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const video = videoRef.current;
    const currentLoc = video ? video.currentTime : 0;
    const seekedTime = seekOffsetRef.current > 0 ? (seekOffsetRef.current + currentLoc) : currentLoc;
    
    localStorage.setItem(resumeKey, Math.floor(seekedTime).toString());

    if (playback.providerId) {
      console.log(`[WebMediaPlayer] Requesting modular stream refresh for ${playback.providerId}`);
      window.dispatchEvent(new CustomEvent("potok:refresh-stream-url", {
        detail: {
          providerId: playback.providerId,
          mediaId: playback.id,
          mediaType: playback.mediaType,
          season: playback.season,
          episode: playback.episode,
          voice: playback.voice
        }
      }));
    } else {
      window.location.reload();
    }
  }, [playback]);

  const handleRefreshStreamRef = useRef(handleRefreshStream);
  useEffect(() => {
    handleRefreshStreamRef.current = handleRefreshStream;
  }, [handleRefreshStream]);

  // Main Media Stream Setup Hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    cleanupActiveResources();
    const sessionId = playerSessionRef.current;

    // Parse starting position for resume once on initial mount
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
    const isStreamServer = normalizedUrl.includes("/stream/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd"].includes(ext) : false;
    const needsRemux = isStreamServer && isNonNative;

    let finalStreamUrl = normalizedUrl;
    if (needsRemux) {
      finalStreamUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(startPos).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : ""
      });
    }

    const proxiedUrl = getProxyUrl(finalStreamUrl);
    const isM3u8 = finalStreamUrl.includes(".m3u8");

    setPlayerError(null);

    if (isM3u8) {
      video.crossOrigin = "anonymous";
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;

        // Inject initial startPosition configuration for native Hls.js resume
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
          syncNativeTextTracks();
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
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, syncNativeTextTracks);
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
                console.log("[WebMediaPlayer] Fatal HLS 410 error. Refreshing stream...");
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
        setSrcResetCounter(p => p + 1);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxiedUrl;
        setSrcResetCounter(p => p + 1);
        video.play().then(() => {
          if (startPos > 0) {
            video.currentTime = startPos;
          }
        }).catch(() => {});
      }
    } else {
      video.setAttribute("crossorigin", "anonymous");
      video.src = proxiedUrl;
      setSrcResetCounter(p => p + 1);
      video.play().then(() => {
        // If it's a remuxed stream, the server already seeked, so browser currentTime 0 is correct.
        // Otherwise, seek to startPos natively.
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
  }, [playback.streamUrl, cleanupActiveResources, getProxyUrl, syncNativeTextTracks]);

  // Video Native Event Handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handlePlaying = () => {
    setIsPlaying(true);
    setIsMetadataLoading(false);
  };

  const handleCanPlay = () => {
    setIsMetadataLoading(false);
  };

  const playPlaylistItem = (index: number) => {
    if (!playback.playlist || index < 0 || index >= playback.playlist.length) return;
    const item = playback.playlist[index];
    playVideo({
      ...playback,
      streamUrl: item.streamUrl,
      streamType: item.streamType,
      season: item.season,
      episode: item.episode,
      title: `${item.title} - S${item.season}E${item.episode}`,
      audios: item?.audios,
      voice: item.voice,
      playlistIndex: index
    });
  };

  const handleEnded = () => {
    if (playback.playlist && playback.playlistIndex !== undefined && playback.playlistIndex + 1 < playback.playlist.length) {
      console.log("[WebMediaPlayer] Episode ended. Auto-playing next...");
      playPlaylistItem(playback.playlistIndex + 1);
    }
  };
  
  const lastTimeRef = useRef(0);
  
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentInt = Math.floor(video.currentTime);
    if (currentInt !== Math.floor(lastTimeRef.current)) {
      lastTimeRef.current = video.currentTime;
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleVolumeChange = () => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setIsMuted(video.muted);
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const diagnosticUrl = getProxyUrl(playback.streamUrl);
    fetch(diagnosticUrl, { method: "HEAD" })
      .then((res) => {
        if (res.status === 403 || res.status === 401) {
          setPlayerError("Доступ к воспроизведению ограничен.");
        } else if (res.status === 410) {
          if (playback.providerId && autoRefreshCountRef.current < 1) {
            autoRefreshCountRef.current += 1;
            console.log("[WebMediaPlayer] video:error 410 Gone detected. Refreshing...");
            handleRefreshStreamRef.current();
          } else {
            setPlayerError("Срок действия ссылки на поток истек.");
          }
        } else {
          setPlayerError("Не удалось загрузить видео-поток.");
        }
      })
      .catch((err) => {
        console.error("[WebMediaPlayer] Diagnostics HEAD fetch failed:", err);
        setPlayerError("Не удалось загрузить видео-поток.");
      })
      .finally(() => {
        setIsMetadataLoading(false);
      });
  };

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (e.key === " ") {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
        handleUserActivity();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(video.currentTime + seekOffset + 10);
        handleUserActivity();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(Math.max(video.currentTime + seekOffset - 10, 0));
        handleUserActivity();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [seekOffset, handleClose, handleUserActivity]);

  // Derived timeline state parameters
  const displayDuration = metadataDuration > 0 ? metadataDuration : (duration || 100);

  // Track Selectors and Player Controls API
  const switchAudio = (id: number) => {
    const h = hlsRef.current;
    if (h && h.audioTracks && h.audioTracks.length > 1) {
      h.audioTrack = id;
      setCurrentAudioTrack(id);
      setShowAudioMenu(false);
      return;
    }

    const normalizedUrl = normalizeStreamUrlToPath(playback.streamUrl);
    const isStreamServer = normalizedUrl.includes("/stream/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const video = videoRef.current;
    const time = video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;

    let newUrl = "";
    if (isStreamServer) {
      setSeekOffset(time);
      newUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(time).toString(),
        audio: id !== -1 ? id.toString() : ""
      });
    } else {
      setSeekOffset(0);
      if (playback.audios && playback.audios[id]) {
        try {
          const targetUrlObj = new URL(playback.audios[id].url);
          if (time > 1) targetUrlObj.searchParams.set("start", Math.floor(time).toString());
          newUrl = targetUrlObj.toString();
        } catch {
          const baseUrl = playback.audios[id].url.split("?")[0];
          const startQuery = time > 1 ? `&start=${Math.floor(time)}` : "";
          newUrl = `${baseUrl}?audio=${id}${startQuery}`;
        }
      } else {
        const baseUrl = playback.streamUrl.split("?")[0];
        const startQuery = time > 1 ? `&start=${Math.floor(time)}` : "";
        newUrl = `${baseUrl}?audio=${id}${startQuery}`;
      }
    }

    // Update video element source for progressive mp4 streams
    if (video) {
      video.pause();
      
      const isNewM3U8 = newUrl.includes(".m3u8");
      if (!isNewM3U8 && hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {}
        hlsRef.current = null;
      }

      subtitleObjectUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("[WebMediaPlayer] Failed to revoke Object URL on subtitle change:", e);
        }
      });
      subtitleObjectUrls.clear();

      const proxiedNewUrl = getProxyUrl(newUrl);
      video.src = proxiedNewUrl;
      setSrcResetCounter(p => p + 1);
      
      video.play().then(() => {
        if (!isStreamServer) video.currentTime = time;
        syncNativeTextTracks();
      }).catch((err) => {
        console.warn("[WebMediaPlayer] Switch audio source failed:", err);
      });
    }

    setCurrentAudioTrack(id);
    setShowAudioMenu(false);
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      video.currentTime = time;
      return;
    }

    const normalizedUrl = normalizeStreamUrlToPath(playback.streamUrl);
    const isStreamServer = normalizedUrl.includes("/stream/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd"].includes(ext) : false;
    const isDefaultAudio = audioTracks.length === 0 || currentAudioTrack === -1 || currentAudioTrack === audioTracks[0].id;
    const needsRemux = isStreamServer && (isNonNative || !isDefaultAudio);

    if (needsRemux) {
      setSeekOffset(time);
      const newUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(time).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : ""
      });

      const isNewM3U8 = newUrl.includes(".m3u8");
      if (!isNewM3U8 && hlsRef.current) {
        try {
          (hlsRef.current as any).stopLoad();
          (hlsRef.current as any).detachMedia();
          (hlsRef.current as any).destroy();
        } catch (e) {}
        hlsRef.current = null;
      }

      subtitleObjectUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("[WebMediaPlayer] Failed to revoke Object URL on subtitle change:", e);
        }
      });
      subtitleObjectUrls.clear();

      const proxiedNewUrl = getProxyUrl(newUrl);
      video.pause();
      video.src = proxiedNewUrl;
      setSrcResetCounter(p => p + 1);
      video.play().then(() => {
        syncNativeTextTracks();
      }).catch((err) => console.warn("Seek remux play error:", err));
    } else {
      setSeekOffset(0);
      video.currentTime = time;
    }
  };

  const switchSubtitle = (id: number) => {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === id ? "showing" : "disabled";
    }
    const h = hlsRef.current;
    if (h) h.subtitleTrack = id;
    setCurrentSubtitleTrack(id);
    setShowSubtitleMenu(false);
  };

  const switchQuality = (id: number) => {
    const video = videoRef.current;
    const h = hlsRef.current;
    if (video && h) {
      const playingState = !video.paused;
      const time = video.currentTime;

      video.pause();
      h.currentLevel = id;
      h.nextLevel = id;

      try {
        h.trigger(Hls.Events.BUFFER_FLUSHING, {
          startOffset: 0,
          endOffset: Infinity,
          type: "video"
        });
      } catch {
        video.currentTime = time;
      }

      if (playingState) {
        setTimeout(() => {
          video.currentTime = time;
          video.play().catch(() => {});
        }, 100);
      } else {
        video.currentTime = time;
      }

      setCurrentQualityLevel(id);
    }
    setShowQualityMenu(false);
  };

  const handleUploadSubtitle = (file: File) => {
    const video = videoRef.current;
    if (!video) return;
    loadExternalSubtitle(video, file, (newIndex, url) => {
      if (url) {
        subtitleObjectUrls.add(url);
      }
      syncNativeTextTracks();
      if (newIndex !== -1) switchSubtitle(newIndex);
    });
  };

  // Click gesture wrappers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    handleUserActivity();
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // Dynamically format quality levels list to include current active ABR resolution in the "Auto" label
  const displayQualityLevels = useMemo(() => {
    const activeLevel = hlsActiveLevel >= 0 ? rawLevels.find(l => l.id === hlsActiveLevel) : null;
    const autoLabel = activeLevel && activeLevel.height
      ? `Авто (${activeLevel.height}p)`
      : "Авто";

    return [
      { id: -1, name: autoLabel },
      ...rawLevels.map((l) => ({
        id: l.id,
        name: l.height ? `${l.height}p` : `Качество ${l.id + 1}`
      }))
    ];
  }, [rawLevels, hlsActiveLevel]);

  // Hooks integration
  const { introRange, outroRange } = useTimecodes(playback.id, playback.season, playback.episode, playback.mediaType === "tv", displayDuration);

  usePlaybackTracker({
    videoRef,
    playback: {
      id: playback.id,
      mediaType: playback.mediaType,
      season: playback.season,
      episode: playback.episode,
    },
    seekOffset,
    isActive: isPlaying,
  });

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // Note: fileIndex and streamHash have been hoisted to the top of the component

  if (isClosed) return null;

  return (
    <div 
      ref={overlayRef}
      className={`web-player-overlay ${!controlsVisible ? "controls-hidden" : ""}`}
      onMouseMove={handleUserActivity}
      onClick={() => { handleUserActivity(); setShowAudioMenu(false); setShowSubtitleMenu(false); setShowQualityMenu(false); setShowPlaylistMenu(false); }}
    >
      {showResumeToast && (
        <div className="player-resume-toast" onClick={(e) => e.stopPropagation()}>
          <span className="player-resume-toast-text">
            Продолжено с {formatTime(resumeTime)}
          </span>
          <div className="player-resume-toast-divider" />
          <button 
            className="player-resume-toast-btn"
            onClick={() => {
              handleSeek(0);
              setShowResumeToast(false);
            }}
          >
            Начать сначала
          </button>
        </div>
      )}

      {isMetadataLoading && loadingState && (
        <div className="player-loading-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="player-loading-card">
            <div className="player-loading-spinner-container">
              <div className="player-loading-spinner" />
              <div className="player-loading-spinner-inner" />
            </div>
            
            <h3 className="player-loading-title">{loadingState.title}</h3>
            <p className="player-loading-subtitle">{loadingState.subtitle}</p>

            {/* Premium Step Progress Tracker */}
            <div className="player-loading-steps">
              {[
                { step: 1, label: "Поиск раздающих" },
                { step: 2, label: "Заголовки" },
                { step: 3, label: "Анализ медиа" },
                { step: 4, label: "Буферизация" }
              ].map((s) => {
                const isActive = loadingState.step === s.step;
                const isCompleted = loadingState.step > s.step;
                return (
                  <div 
                    key={s.step} 
                    className={`player-loading-step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                  >
                    <div className="step-dot">
                      {isCompleted ? "✓" : s.step}
                    </div>
                    <span className="step-label">{s.label}</span>
                  </div>
                );
              })}
            </div>

            <button 
              className="player-loading-cancel-btn" 
              onClick={handleClose}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="artplayer-video-container" onClick={togglePlay} onDoubleClick={toggleFullscreen}>
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          onPlay={handlePlay}
          onPlaying={handlePlaying}
          onCanPlay={handleCanPlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onVolumeChange={handleVolumeChange}
          onError={handleVideoError}
          onEnded={handleEnded}
          autoPlay
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        >
          {injectedSubtitles.map((track, index) => (
            <track
              key={track.id + "_" + srcResetCounter}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang}
              src={track.src}
              default={currentSubtitleTrack === index} // Установка флага по умолчанию
            />
          ))}
        </video>
      </div>

      {playerError && (
        <div className="player-error-overlay" onClick={(e) => e.stopPropagation()}>
          <AlertTriangle size={48} />
          <h3 className="error-title">Ошибка воспроизведения</h3>
          <p className="error-message">{playerError}</p>
          <div className="error-details">Ссылка: <code>{playback.streamUrl}</code></div>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button 
              className="error-close-btn" 
              style={{ background: "rgba(255, 255, 255, 0.15)", color: "#fff" }} 
              onClick={handleRefreshStream}
            >
              Обновить поток
            </button>
            <button className="error-close-btn" onClick={handleClose}>Закрыть плеер</button>
          </div>
        </div>
      )}

      <PlayerTopBar
        title={playback.title}
        mediaType={playback.mediaType}
        season={playback.season}
        episode={playback.episode}
        onClose={handleClose}
        visible={controlsVisible}
      />

      {isNetworkOffline && (
        <div style={{
          position: "absolute",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99,
          background: "rgba(220, 38, 38, 0.9)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "0.95rem",
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          pointerEvents: "none"
        }}>
          <AlertTriangle size={18} />
          <span>Связь потеряна. Воспроизведение идет из буфера...</span>
        </div>
      )}

      <SkipIntroButton
        videoRef={videoRef}
        seekOffset={seekOffset}
        introRange={introRange}
        displayDuration={displayDuration}
        onSeek={handleSeek}
      />

      <SkipOutroButton
        videoRef={videoRef}
        seekOffset={seekOffset}
        outroRange={outroRange}
        displayDuration={displayDuration}
        onSeek={handleSeek}
      />

      <PlayerStatsHUD
        showStats={showStats}
        videoRef={videoRef}
        hlsRef={hlsRef}
        isPlaying={isPlaying}
        streamUrl={playback.streamUrl}
        streamHash={playback.streamHash || ""}
        duration={displayDuration}
        onClose={() => setShowStats(false)}
      />

      <PlayerControls
        videoRef={videoRef}
        controlsVisible={controlsVisible}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        duration={displayDuration}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={(vol) => { if (videoRef.current) videoRef.current.volume = vol; }}
        onToggleMuted={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        audioTracks={audioTracks}
        currentAudioTrack={currentAudioTrack}
        onSelectAudioTrack={switchAudio}
        showAudioMenu={showAudioMenu}
        onToggleAudioMenu={() => { setShowAudioMenu(!showAudioMenu); setShowSubtitleMenu(false); setShowQualityMenu(false); setShowPlaylistMenu(false); }}
        subtitleTracks={subtitleTracks}
        currentSubtitleTrack={currentSubtitleTrack}
        onSelectSubtitleTrack={switchSubtitle}
        showSubtitleMenu={showSubtitleMenu}
        onToggleSubtitleMenu={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowAudioMenu(false); setShowQualityMenu(false); setShowPlaylistMenu(false); }}
        onUploadSubtitle={handleUploadSubtitle}
        qualityLevels={displayQualityLevels}
        currentQualityLevel={currentQualityLevel}
        onSelectQualityLevel={switchQuality}
        showQualityMenu={showQualityMenu}
        onToggleQualityMenu={() => { setShowQualityMenu(!showQualityMenu); setShowAudioMenu(false); setShowSubtitleMenu(false); setShowPlaylistMenu(false); }}
        playlist={playback.playlist}
        playlistIndex={playback.playlistIndex}
        onSelectPlaylistItem={playPlaylistItem}
        showPlaylistMenu={showPlaylistMenu}
        onTogglePlaylistMenu={() => { setShowPlaylistMenu(!showPlaylistMenu); setShowAudioMenu(false); setShowSubtitleMenu(false); setShowQualityMenu(false); }}
        seekOffset={seekOffset}
        streamHash={streamHash}
        fileIndex={fileIndex}
      />
    </div>
  );
};
