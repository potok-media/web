import React, { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { ApiClient } from "../network/ApiClient";
import type { ActivePlayback } from "../context/AppSettingsContext";
import { PlayerTopBar } from "./player/PlayerTopBar";
import { PlayerStatsHUD } from "./player/PlayerStatsHUD";
import { PlayerControls } from "./player/PlayerControls";
import { loadExternalSubtitle } from "../utils/SubtitleHelper";
import { useTimecodes } from "../hooks/useTimecodes";
import { usePlayerStats } from "../hooks/usePlayerStats";

type SafeArtplayer = Artplayer & { hls?: Hls; };

interface WebMediaPlayerProps {
  playback: ActivePlayback;
  onClose: () => void;
  isNetworkOffline?: boolean;
}

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = ({ playback, onClose, isNetworkOffline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);

  // Added refs for absolute resource tracking and cleanup
  const playerSessionRef = useRef<number>(0);
  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const autoRefreshCountRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Centralized, bulletproof and highly aggressive resource cleanup function
  const cleanupActiveResources = () => {
    // 1. Invalidate any active session
    playerSessionRef.current += 1;
    const currentSession = playerSessionRef.current;
    
    console.log(`[WebMediaPlayer] Cleaning up resources for session ${currentSession}...`);

    // 2. Tear down active HLS instance
    if (hlsRef.current) {
      try {
        console.log("[WebMediaPlayer] Destroying active HLS instance...");
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.error("[WebMediaPlayer] Error destroying HLS instance:", e);
      }
      hlsRef.current = null;
    }

    // 3. Tear down active video element
    if (videoRef.current) {
      try {
        console.log("[WebMediaPlayer] Pausing and clearing video element...");
        const video = videoRef.current;
        video.pause();
        video.src = "";
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        console.error("[WebMediaPlayer] Error cleaning up video element:", e);
      }
      videoRef.current = null;
    }

    // 4. Tear down Artplayer instance
    if (artRef.current) {
      try {
        console.log("[WebMediaPlayer] Destroying Artplayer instance...");
        const art = artRef.current;
        if (art.video) {
          try {
            art.video.pause();
            art.video.src = "";
            art.video.removeAttribute("src");
            art.video.load();
          } catch (e) {}
        }
        art.destroy();
      } catch (e) {
        console.error("[WebMediaPlayer] Error destroying Artplayer instance:", e);
      }
      artRef.current = null;
    }

    // 5. Aggressively scan container and kill any remaining / orphaned video elements
    if (containerRef.current) {
      try {
        const videos = containerRef.current.getElementsByTagName("video");
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          console.log("[WebMediaPlayer] Aggressively pausing and clearing orphaned video element in container");
          try {
            v.pause();
            v.src = "";
            v.removeAttribute("src");
            v.load();
          } catch (e) {}
        }
      } catch (e) {}
      containerRef.current.innerHTML = "";
    }

    // 6. Global sweep of all video and audio elements inside application mount container (#root) as a ultimate safety net
    try {
      console.log("[WebMediaPlayer] Performing isolated media teardown sweep inside #root...");
      const allMedia = document.querySelectorAll("#root video, #root audio");
      allMedia.forEach((el) => {
        try {
          const media = el as HTMLMediaElement;
          media.pause();
          media.src = "";
          media.removeAttribute("src");
          media.load();
        } catch (e) {
          console.error("[WebMediaPlayer] Error during global media teardown sweep on el:", e);
        }
      });
    } catch (e) {
      console.error("[WebMediaPlayer] Error during global media teardown sweep:", e);
    }

    setQualityLevels([]);
    setCurrentQualityLevel(-1);
    setShowQualityMenu(false);
  };

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [bufferSec, setBufferSec] = useState(0);

  // Virtualized Clock States
  const [metadataDuration, setMetadataDuration] = useState(0);
  const [seekOffset, setSeekOffset] = useState(() => {
    // Check if there is an auto-resume position from an expired link refresh
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const savedResume = localStorage.getItem(resumeKey);
    if (savedResume) {
      localStorage.removeItem(resumeKey);
      const parsed = Number(savedResume);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    try {
      const url = new URL(playback.streamUrl);
      const start = url.searchParams.get("start");
      return start ? Number(start) : 0;
    } catch {
      const match = playback.streamUrl.match(/[?&]start=(\d+)/i);
      return match ? Number(match[1]) : 0;
    }
  });

  // Tracks Lists
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showStats, setShowStats] = useState(false);

  // Helper to automatically route external CDN streams through high-performance C# BFF stream proxy
  const getProxyUrl = (targetUrl: string) => {
    if (!targetUrl) return targetUrl;
    const apiTKey = "/api/tor" + "rent";
    if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1") || targetUrl.includes(apiTKey) || targetUrl.includes("/stream/")) {
      return targetUrl;
    }
    const gatewayBase = ApiClient.baseURL.replace(/\/+$/, "");
    let proxyUrl = `${gatewayBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;

    if (playback.headers) {
      if (playback.headers["Referer"]) {
        proxyUrl += `&referer=${encodeURIComponent(playback.headers["Referer"])}`;
      }
      if (playback.headers["Origin"]) {
        proxyUrl += `&origin=${encodeURIComponent(playback.headers["Origin"])}`;
      }
    }
    return proxyUrl;
  };

  // Initialize audioTracks from playback.audios if provided
  useEffect(() => {
    if (playback.audios && playback.audios.length > 0) {
      const tracks = playback.audios.map((a, idx) => ({ id: idx, name: a.name }));
      setAudioTracks(tracks);
      
      // Determine default active track based on URL query
      let activeIdx = 0;
      try {
        const url = new URL(playback.streamUrl);
        const audioParam = url.searchParams.get("audio");
        if (audioParam !== null) {
          const parsed = parseInt(audioParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < playback.audios.length) {
            activeIdx = parsed;
          }
        }
      } catch {
        const match = playback.streamUrl.match(/[?&]audio=(\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 0 && parsed < playback.audios.length) {
            activeIdx = parsed;
          }
        }
      }
      setCurrentAudioTrack(activeIdx);
    }
  }, [playback.audios, playback.streamUrl]);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayDuration = metadataDuration > 0 ? metadataDuration : (duration || 100);
  const displayCurrentTime = seekOffset > 0 ? (seekOffset + currentTime) : currentTime;
  const displayBufferedTime = seekOffset > 0 ? (seekOffset + bufferedTime) : bufferedTime;

  const displayCurrentTimeRef = useRef(displayCurrentTime);
  useEffect(() => {
    displayCurrentTimeRef.current = displayCurrentTime;
  }, [displayCurrentTime]);

  // Hooks
  const { introRange, outroRange } = useTimecodes(playback.id, playback.season, playback.episode, playback.mediaType === "tv", displayDuration);
  const { downloadSpeed, bitrate, resolution, fps } = usePlayerStats(
    artRef,
    isPlaying,
    showStats,
    playback.streamUrl,
    playback.streamHash || "",
    displayDuration
  );

  const handleRefreshStream = () => {
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    localStorage.setItem(resumeKey, Math.floor(displayCurrentTimeRef.current).toString());

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
      console.log("[WebMediaPlayer] Falling back to standard full page reload stream refresh");
      window.location.reload();
    }
  };

  const showSkipIntro = introRange && displayCurrentTime >= introRange.start && displayCurrentTime <= introRange.end;
  const showSkipOutro = outroRange && displayCurrentTime >= outroRange.start && displayCurrentTime <= (outroRange.end || displayDuration);

  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (artRef.current?.playing) {
        setControlsVisible(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
      }
    }, 3000);
  };

  const syncNativeTextTracks = () => {
    const video = artRef.current?.video;
    if (!video) return;
    const tracks: { id: number; name: string }[] = [];
    let activeIdx = -1;
    for (let i = 0; i < video.textTracks.length; i++) {
      const t = video.textTracks[i];
      if (t.kind === "subtitles" || t.kind === "captions") {
        tracks.push({ id: i, name: t.label || t.language || `Субтитры ${i + 1}` });
        if (t.mode === "showing") activeIdx = i;
      }
    }
    setSubtitleTracks(tracks);
    setCurrentSubtitleTrack(activeIdx);
  };

  const reinjectSubtitles = () => {
    const video = artRef.current?.video;
    const streamHash = playback.streamHash;
    if (!video || !streamHash) return;
    const match = playback.streamUrl.match(/\/stream\/[a-f0-9]+\/(\d+)/i);
    if (!match) return;
    subtitleTracks.forEach((s) => {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].label === s.name) return;
      }
      const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = s.name;
      track.srclang = "custom";
      track.src = `${cleanBase}/stream/${streamHash.toLowerCase()}/${match[1]}/subtitles/${s.id}`;
      video.appendChild(track);
    });
    setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === currentSubtitleTrack ? "showing" : "disabled";
      }
    }, 200);
  };

  // Dynamic loopback subtitles & audio track discovery
  useEffect(() => {
    const match = playback.streamUrl.match(/\/stream\/[a-f0-9]+\/(\d+)/i);
    const streamHash = playback.streamHash;
    if (!match || !streamHash) return;
    const fileId = match[1];
    let isMounted = true;

    const loadMetadata = async () => {
      try {
        const meta = await ApiClient.getStreamMetadata(streamHash, fileId);
        if (!isMounted || !meta || !meta.success) return;
        if (meta.duration > 0) setMetadataDuration(meta.duration);

        const audios = meta.tracks.filter(t => t.type === "audio").map(t => ({ id: t.index, name: t.title }));
        if (audios.length > 0) {
          setAudioTracks(audios);
          setCurrentAudioTrack(prev => prev === -1 ? audios[0].id : prev);
        }

        const video = artRef.current?.video;
        if (!video) return;

        meta.tracks.filter(t => t.type === "subtitle").forEach((s) => {
          let exists = false;
          for (let i = 0; i < video.textTracks.length; i++) {
            if (video.textTracks[i].label === s.title) { exists = true; break; }
          }
          if (exists) return;

          const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
          const subUrl = `${cleanBase}/stream/${streamHash.toLowerCase()}/${fileId}/subtitles/${s.relIndex}`;
          const track = document.createElement("track");
          track.kind = "subtitles";
          track.label = s.title;
          track.srclang = s.language || "custom";
          track.src = subUrl;
          video.appendChild(track);
        });

        setTimeout(() => { if (isMounted) syncNativeTextTracks(); }, 400);
      } catch (err) {
        console.warn("Failed to load stream metadata:", err);
      }
    };

    loadMetadata();
    return () => { isMounted = false; };
  }, [playback.streamUrl, playback.streamHash]);

  useEffect(() => {
    handleUserActivity();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  useEffect(() => {
    if (isNetworkOffline) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn("Failed to exit fullscreen imperatively:", err);
        });
      }
    }
  }, [isNetworkOffline]);

  // Main ArtPlayer setup
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. First, call cleanup to synchronously kill everything currently active
    cleanupActiveResources();

    // 2. Increment session counter to signify a brand new initialization session
    playerSessionRef.current += 1;
    const sessionId = playerSessionRef.current;

    const proxiedUrl = getProxyUrl(playback.streamUrl);
    console.log(`[WebMediaPlayer] Initializing player session ${sessionId} for ${playback.streamUrl} (proxied: ${proxiedUrl})`);

    const art = new Artplayer({
      container: containerRef.current,
      url: proxiedUrl,
      type: playback.streamUrl.includes(".m3u8") ? "m3u8" : "mp4",
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string) {
          // Check if this initialization session is still the active one
          if (playerSessionRef.current !== sessionId) {
            console.warn(`[WebMediaPlayer] Session ${sessionId} became inactive before Hls initialization. Aborting.`);
            try {
              video.pause();
              video.src = "";
              video.removeAttribute("src");
              video.load();
            } catch (e) {}
            return;
          }

          if (Hls.isSupported()) {
            // Clean up any old Hls instance first
            if (hlsRef.current) {
              try {
                hlsRef.current.stopLoad();
                hlsRef.current.detachMedia();
                hlsRef.current.destroy();
              } catch (e) {}
              hlsRef.current = null;
            }

            const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
            
            // Immediately store in refs so we can clean it up if needed
            hlsRef.current = hls;
            videoRef.current = video;

            hls.loadSource(url);
            hls.attachMedia(video);

            // Double check session validity after synchronous calls
            if (playerSessionRef.current !== sessionId) {
              console.warn(`[WebMediaPlayer] Session ${sessionId} became inactive during Hls attachment. Destroying Hls.`);
              try {
                hls.stopLoad();
                hls.detachMedia();
                hls.destroy();
              } catch (e) {}
              if (hlsRef.current === hls) hlsRef.current = null;
              try {
                video.pause();
                video.src = "";
                video.removeAttribute("src");
                video.load();
              } catch (e) {}
              return;
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
                return { id: t.id, name };
              });
              setAudioTracks(audios);
              setCurrentAudioTrack(hls.audioTrack);
              syncNativeTextTracks();
            };

            const updateQualityLevels = () => {
              if (playerSessionRef.current !== sessionId) return;
              const levels = hls.levels || [];
              const parsed = [
                { id: -1, name: "Авто" },
                ...levels.map((l, idx) => ({
                  id: idx,
                  name: l.height ? `${l.height}p` : `Качество ${idx + 1}`
                }))
              ];
              setQualityLevels(parsed);
              setCurrentQualityLevel(hls.loadLevel);
            };

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              updateAudioTracks();
              updateQualityLevels();
            });
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, updateAudioTracks);
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, syncNativeTextTracks);
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
              if (playerSessionRef.current !== sessionId) return;
              setCurrentAudioTrack(hls.audioTrack);
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
                    console.log("[WebMediaPlayer] Fatal HLS 410 Gone error. Auto-refreshing stream url...");
                    handleRefreshStream();
                  } else {
                    setPlayerError("Срок действия ссылки на поток истек.");
                  }
                  return;
                }

                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
              }
            });

            art.on("destroy", () => {
              try {
                hls.stopLoad();
                hls.detachMedia();
                hls.destroy();
              } catch (e) {
                console.warn("Hls destroy error:", e);
              }
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            videoRef.current = video;
            video.src = url;
          }
        }
      },
      autoplay: true,
      volume: 1,
      muted: false,
    });

    artRef.current = art;
    if (art.video) {
      videoRef.current = art.video;
      if (playback.streamUrl.includes(".m3u8")) {
        art.video.crossOrigin = "anonymous";
      } else {
        art.video.removeAttribute("crossorigin");
      }
      art.video.style.cursor = "pointer";
      art.video.addEventListener("click", () => art.toggle());
      art.video.textTracks.addEventListener("addtrack", syncNativeTextTracks);
      art.video.textTracks.addEventListener("removetrack", syncNativeTextTracks);
      art.video.textTracks.addEventListener("change", syncNativeTextTracks);
    }

    // Set .hls on art now if it's already set (synchronous customType)
    if (hlsRef.current) {
      try {
        (art as SafeArtplayer).hls = hlsRef.current;
      } catch (e) {}
    }

    art.on("ready", () => {
      if (playerSessionRef.current !== sessionId) return;
      art.play().catch(() => { art.muted = true; art.play().catch((err) => console.error("Autoplay failed:", err)); });
      syncNativeTextTracks();
    });

    art.on("play", () => {
      if (playerSessionRef.current !== sessionId) return;
      setIsPlaying(true);
      setPlayerError(null);
    });
    art.on("pause", () => {
      if (playerSessionRef.current !== sessionId) return;
      setIsPlaying(false);
    });
    art.on("error", (err) => {
      if (playerSessionRef.current !== sessionId) return;
      setPlayerError(err?.message || "Ошибка инициализации медиаплеера");
    });
    art.on("video:error", () => {
      if (playerSessionRef.current !== sessionId) return;
      fetch(playback.streamUrl, { method: "HEAD" })
        .then((res) => {
          if (playerSessionRef.current !== sessionId) return;
          if (res.status === 403 || res.status === 401) {
            setPlayerError("Доступ к воспроизведению ограничен.");
          } else if (res.status === 410) {
            if (playback.providerId && autoRefreshCountRef.current < 1) {
              autoRefreshCountRef.current += 1;
              console.log("[WebMediaPlayer] video:error 410 Gone detected. Auto-refreshing stream...");
              handleRefreshStream();
            } else {
              setPlayerError("Срок действия ссылки на поток истек.");
            }
          } else {
            setPlayerError("Не удалось загрузить видео-поток.");
          }
        })
        .catch((err) => {
          if (playerSessionRef.current !== sessionId) return;
          console.error("[WebMediaPlayer] video:error fetch failed:", err);
          setPlayerError("Не удалось загрузить видео-поток.");
        });
    });

    art.on("video:timeupdate", () => {
      if (playerSessionRef.current !== sessionId) return;
      setCurrentTime(art.currentTime);
      const v = art.video;
      if (!v) return;
      const b = v.buffered;
      let buf = 0;
      for (let i = 0; i < b.length; i++) {
        if (v.currentTime >= b.start(i) && v.currentTime <= b.end(i)) { buf = b.end(i) - v.currentTime; break; }
      }
      setBufferSec(buf);
      if (b.length > 0) setBufferedTime(b.end(b.length - 1));
    });

    art.on("video:durationchange", () => {
      if (playerSessionRef.current !== sessionId) return;
      setDuration(art.duration);
    });
    art.on("video:volumechange", () => {
      if (playerSessionRef.current !== sessionId) return;
      setVolume(art.volume);
      setIsMuted(art.muted);
    });
    art.on("fullscreen", (state) => {
      if (playerSessionRef.current !== sessionId) return;
      setIsFullscreen(state);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); art.toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleSeek(displayCurrentTimeRef.current + 10); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handleSeek(Math.max(displayCurrentTimeRef.current - 10, 0)); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cleanupActiveResources();
    };
  }, [playback.streamUrl]);

  const switchAudio = (id: number) => {
    const art = artRef.current;
    if (!art) return;
    const h = (art as SafeArtplayer).hls;
    if (h && h.audioTracks && h.audioTracks.length > 1) {
      h.audioTrack = id;
      setCurrentAudioTrack(id);
      setShowAudioMenu(false);
      return;
    }

    const isStreamServer = !!(playback.streamHash || (playback as any)["tor" + "rentHash"]);
    const time = displayCurrentTime;
    if (isStreamServer) {
      setSeekOffset(time);
    } else {
      setSeekOffset(0);
    }

    let newUrl = "";
    if (playback.audios && playback.audios[id]) {
      try {
        const targetUrlObj = new URL(playback.audios[id].url);
        if (time > 1) {
          targetUrlObj.searchParams.set("start", Math.floor(time).toString());
        }
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

    // Clean up active Hls if switching to a non-m3u8 stream to prevent background leak
    const isNewM3U8 = newUrl.includes(".m3u8");
    if (!isNewM3U8 && hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }

    const proxiedNewUrl = getProxyUrl(newUrl);
    art.switchUrl(proxiedNewUrl)
      .then(() => {
        if (!isMountedRef.current || artRef.current !== art) {
          console.log("[WebMediaPlayer] switchAudio promise resolved but component is unmounted or art instance changed. Preventing .play()");
          return;
        }
        if (!isStreamServer) {
          art.currentTime = time;
        }
        reinjectSubtitles();
        art.play();
      })
      .catch((err) => {
        console.warn("[WebMediaPlayer] switchAudio URL switch failed or aborted:", err);
      });
    setCurrentAudioTrack(id);
    setShowAudioMenu(false);
  };

  const handleSeek = (time: number) => {
    const art = artRef.current;
    if (!art) return;
    const h = (art as SafeArtplayer).hls;
    if (h) { art.currentTime = time; return; }

    const isStreamServer = !!(playback.streamHash || (playback as any)["tor" + "rentHash"]);
    const isMKV = playback.streamUrl.includes(".mkv") || playback.streamUrl.includes(".MKV");
    
    const isDefaultAudio = audioTracks.length === 0 || currentAudioTrack === -1 || currentAudioTrack === audioTracks[0].id;
    const needsRemux = isStreamServer && (isMKV || !isDefaultAudio);

    if (needsRemux) {
      setSeekOffset(time);
      let newUrl = "";
      if (playback.audios && playback.audios[currentAudioTrack]) {
        try {
          const targetUrlObj = new URL(playback.audios[currentAudioTrack].url);
          targetUrlObj.searchParams.set("start", Math.floor(time).toString());
          newUrl = targetUrlObj.toString();
        } catch {
          const baseUrl = playback.audios[currentAudioTrack].url.split("?")[0];
          const audioQuery = currentAudioTrack !== -1 ? `&audio=${currentAudioTrack}` : "";
          newUrl = `${baseUrl}?start=${Math.floor(time)}${audioQuery}`;
        }
      } else {
        const baseUrl = playback.streamUrl.split("?")[0];
        const audioQuery = currentAudioTrack !== -1 ? `&audio=${currentAudioTrack}` : "";
        newUrl = `${baseUrl}?start=${Math.floor(time)}${audioQuery}`;
      }

      // Clean up active Hls if switching to a non-m3u8 stream to prevent background leak
      const isNewM3U8 = newUrl.includes(".m3u8");
      if (!isNewM3U8 && hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {}
          hlsRef.current = null;
      }

      const proxiedNewUrl = getProxyUrl(newUrl);
      art.switchUrl(proxiedNewUrl)
        .then(() => {
          if (!isMountedRef.current || artRef.current !== art) {
            console.log("[WebMediaPlayer] handleSeek promise resolved but component is unmounted or art instance changed. Preventing .play()");
            return;
          }
          reinjectSubtitles();
          art.play();
        })
        .catch((err) => {
          console.warn("[WebMediaPlayer] handleSeek URL switch failed or aborted:", err);
        });
    } else {
      setSeekOffset(0);
      art.currentTime = time;
    }
  };

  const switchSubtitle = (id: number) => {
    const video = artRef.current?.video;
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === id ? "showing" : "disabled";
      }
    }
    const h = (artRef.current as SafeArtplayer | null)?.hls;
    if (h) h.subtitleTrack = id;
    setCurrentSubtitleTrack(id);
    setShowSubtitleMenu(false);
  };

  const switchQuality = (id: number) => {
    const art = artRef.current;
    if (!art) return;
    const h = (art as SafeArtplayer).hls;
    if (h) {
      h.currentLevel = id;
      setCurrentQualityLevel(id);
    }
    setShowQualityMenu(false);
  };

  const handleUploadSubtitle = (file: File) => {
    const video = artRef.current?.video;
    if (!video) return;
    loadExternalSubtitle(video, file, (newIndex) => {
      syncNativeTextTracks();
      if (newIndex !== -1) switchSubtitle(newIndex);
    });
  };

  return (
    <div 
      className={`web-player-overlay ${!controlsVisible ? "controls-hidden" : ""}`}
      onMouseMove={handleUserActivity}
      onClick={() => { handleUserActivity(); setShowAudioMenu(false); setShowSubtitleMenu(false); }}
    >
      <div 
        ref={containerRef} 
        className="artplayer-video-container"
        onClick={(e) => { e.stopPropagation(); artRef.current?.toggle(); }}
      />

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
            <button className="error-close-btn" onClick={onClose}>Закрыть плеер</button>
          </div>
        </div>
      )}

      <PlayerTopBar
        title={playback.title}
        mediaType={playback.mediaType}
        season={playback.season}
        episode={playback.episode}
        onClose={onClose}
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

      {showSkipIntro && (
        <button className="skip-intro-overlay-btn" onClick={(e) => { e.stopPropagation(); if (artRef.current && introRange) handleSeek(introRange.end); }}>
          <span>Пропустить интро</span>
          <ChevronRight size={18} />
        </button>
      )}

      {showSkipOutro && (
        <button 
          className={`skip-intro-overlay-btn outro-btn ${showSkipIntro ? "stacked" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (artRef.current && outroRange) handleSeek(Math.min(outroRange.end || displayDuration, displayDuration - 1)); }}
        >
          <span>Пропустить титры</span>
          <ChevronRight size={18} />
        </button>
      )}

      <PlayerStatsHUD
        showStats={showStats}
        downloadSpeed={downloadSpeed}
        bitrate={bitrate}
        resolution={resolution}
        bufferSec={bufferSec}
        fps={fps}
      />

      <PlayerControls
        controlsVisible={controlsVisible}
        isPlaying={isPlaying}
        onTogglePlay={() => artRef.current?.toggle()}
        currentTime={displayCurrentTime}
        duration={displayDuration}
        bufferedTime={displayBufferedTime}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={(vol) => { if (artRef.current) artRef.current.volume = vol; }}
        onToggleMuted={() => { if (artRef.current) artRef.current.muted = !artRef.current.muted; }}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => { if (artRef.current) artRef.current.fullscreen = !artRef.current.fullscreen; }}
        audioTracks={audioTracks}
        currentAudioTrack={currentAudioTrack}
        onSelectAudioTrack={switchAudio}
        showAudioMenu={showAudioMenu}
        onToggleAudioMenu={() => { setShowAudioMenu(!showAudioMenu); setShowSubtitleMenu(false); setShowQualityMenu(false); }}
        subtitleTracks={subtitleTracks}
        currentSubtitleTrack={currentSubtitleTrack}
        onSelectSubtitleTrack={switchSubtitle}
        showSubtitleMenu={showSubtitleMenu}
        onToggleSubtitleMenu={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowAudioMenu(false); setShowQualityMenu(false); }}
        onUploadSubtitle={handleUploadSubtitle}
        qualityLevels={qualityLevels}
        currentQualityLevel={currentQualityLevel}
        onSelectQualityLevel={switchQuality}
        showQualityMenu={showQualityMenu}
        onToggleQualityMenu={() => { setShowQualityMenu(!showQualityMenu); setShowAudioMenu(false); setShowSubtitleMenu(false); }}
      />
    </div>
  );
};
