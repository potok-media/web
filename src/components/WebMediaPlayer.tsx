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
}

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = ({ playback, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);

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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showStats, setShowStats] = useState(false);

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
    playback.torrentHash || "",
    displayDuration
  );

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
    if (!video || !playback.torrentHash) return;
    const match = playback.streamUrl.match(/\/stream\/[a-f0-9]+\/(\d+)/i);
    if (!match) return;
    subtitleTracks.forEach((s) => {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].label === s.name) return;
      }
      const cleanBase = ApiClient.torrentGoURL.replace(/\/+$/, "");
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = s.name;
      track.srclang = "custom";
      track.src = `${cleanBase}/stream/${playback.torrentHash!.toLowerCase()}/${match[1]}/subtitles/${s.id}`;
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
    if (!match || !playback.torrentHash) return;
    const fileId = match[1];
    let isMounted = true;

    const loadMetadata = async () => {
      try {
        const meta = await ApiClient.getStreamMetadata(playback.torrentHash!, fileId);
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

          const cleanBase = ApiClient.torrentGoURL.replace(/\/+$/, "");
          const subUrl = `${cleanBase}/stream/${playback.torrentHash!.toLowerCase()}/${fileId}/subtitles/${s.relIndex}`;
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
  }, [playback.streamUrl, playback.torrentHash]);

  useEffect(() => {
    handleUserActivity();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  // Main ArtPlayer setup
  useEffect(() => {
    if (!containerRef.current) return;
    const art = new Artplayer({
      container: containerRef.current,
      url: playback.streamUrl,
      type: playback.streamUrl.includes(".m3u8") ? "m3u8" : "mp4",
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string) {
          if (Hls.isSupported()) {
            const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
            hls.loadSource(url);
            hls.attachMedia(video);
            (art as SafeArtplayer).hls = hls;

            const updateAudioTracks = () => {
              const audios = (hls.audioTracks || []).map((t, idx) => ({ id: t.id, name: t.name || `Дорожка ${idx + 1}` }));
              setAudioTracks(audios);
              setCurrentAudioTrack(hls.audioTrack);
              syncNativeTextTracks();
            };

            hls.on(Hls.Events.MANIFEST_PARSED, updateAudioTracks);
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, updateAudioTracks);
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, syncNativeTextTracks);
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => setCurrentAudioTrack(hls.audioTrack));

            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
              }
            });
            art.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
      art.video.crossOrigin = "anonymous";
      art.video.style.cursor = "pointer";
      art.video.addEventListener("click", () => art.toggle());
      art.video.textTracks.addEventListener("addtrack", syncNativeTextTracks);
      art.video.textTracks.addEventListener("removetrack", syncNativeTextTracks);
      art.video.textTracks.addEventListener("change", syncNativeTextTracks);
    }

    art.on("ready", () => {
      art.play().catch(() => { art.muted = true; art.play().catch((err) => console.error("Autoplay failed:", err)); });
      syncNativeTextTracks();
    });

    art.on("play", () => { setIsPlaying(true); setPlayerError(null); });
    art.on("pause", () => setIsPlaying(false));
    art.on("error", (err) => setPlayerError(err?.message || "Ошибка инициализации медиаплеера"));
    art.on("video:error", () => {
      const e = art.video?.error;
      let msg = "Ошибка загрузки видео-потока";
      if (e?.code === e?.MEDIA_ERR_DECODE || e?.code === e?.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = "Данный файл не поддерживается плеером.";
      }
      setPlayerError(msg);
    });

    art.on("video:timeupdate", () => {
      setCurrentTime(art.currentTime);
      const v = art.video;
      const b = v.buffered;
      let buf = 0;
      for (let i = 0; i < b.length; i++) {
        if (v.currentTime >= b.start(i) && v.currentTime <= b.end(i)) { buf = b.end(i) - v.currentTime; break; }
      }
      setBufferSec(buf);
      if (b.length > 0) setBufferedTime(b.end(b.length - 1));
    });

    art.on("video:durationchange", () => setDuration(art.duration));
    art.on("video:volumechange", () => { setVolume(art.volume); setIsMuted(art.muted); });
    art.on("fullscreen", (state) => setIsFullscreen(state));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); art.toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleSeek(displayCurrentTimeRef.current + 10); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handleSeek(Math.max(displayCurrentTimeRef.current - 10, 0)); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      art.destroy();
    };
  }, [playback.streamUrl]);

  const switchAudio = (id: number) => {
    const art = artRef.current;
    if (!art) return;
    const h = (art as SafeArtplayer).hls;
    if (h) {
      h.audioTrack = id;
      setCurrentAudioTrack(id);
      setShowAudioMenu(false);
      return;
    }

    const time = displayCurrentTime;
    setSeekOffset(time);

    const baseUrl = playback.streamUrl.split("?")[0];
    const startQuery = time > 1 ? `&start=${Math.floor(time)}` : "";
    const newUrl = `${baseUrl}?audio=${id}${startQuery}`;

    art.switchUrl(newUrl).then(() => {
      reinjectSubtitles();
      art.play();
    });
    setCurrentAudioTrack(id);
    setShowAudioMenu(false);
  };

  const handleSeek = (time: number) => {
    const art = artRef.current;
    if (!art) return;
    const h = (art as SafeArtplayer).hls;
    if (h) { art.currentTime = time; return; }

    const isMKV = playback.streamUrl.includes(".mkv") || playback.streamUrl.includes(".MKV");
    
    const isDefaultAudio = audioTracks.length === 0 || currentAudioTrack === -1 || currentAudioTrack === audioTracks[0].id;
    const needsRemux = isMKV || !isDefaultAudio;

    if (needsRemux) {
      setSeekOffset(time);
      const baseUrl = playback.streamUrl.split("?")[0];
      const audioQuery = currentAudioTrack !== -1 ? `&audio=${currentAudioTrack}` : "";
      const newUrl = `${baseUrl}?start=${Math.floor(time)}${audioQuery}`;
      art.switchUrl(newUrl).then(() => {
        reinjectSubtitles();
        art.play();
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
          <button className="error-close-btn" onClick={onClose}>Закрыть плеер</button>
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
        onToggleAudioMenu={() => { setShowAudioMenu(!showAudioMenu); setShowSubtitleMenu(false); }}
        subtitleTracks={subtitleTracks}
        currentSubtitleTrack={currentSubtitleTrack}
        onSelectSubtitleTrack={switchSubtitle}
        showSubtitleMenu={showSubtitleMenu}
        onToggleSubtitleMenu={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowAudioMenu(false); }}
        onUploadSubtitle={handleUploadSubtitle}
      />
    </div>
  );
};
