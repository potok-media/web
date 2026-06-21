import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { usePlayback, type ActivePlayback } from "../context/AppSettingsContext";
import { PlayerTopBar } from "./player/PlayerTopBar";
import { PlayerStatsHUD } from "./player/PlayerStatsHUD";
import { PlayerControls } from "./player/PlayerControls";
import { loadExternalSubtitle } from "../utils/SubtitleHelper";
import { useTimecodes } from "../hooks/useTimecodes";
import { usePlaybackTracker } from "../hooks/usePlaybackTracker";

// Helpers & Utilities
import {
  getProxyUrl,
  normalizeStreamUrlToPath,
  updateStreamUrlParams,
  getFileExtension,
} from "../utils/playerHelpers";

// Components
import { SkipIntroButton } from "./player/SkipIntroButton";
import { SkipOutroButton } from "./player/SkipOutroButton";
import { PlayerResumeToast } from "./player/PlayerResumeToast";
import { PlayerLoadingOverlay } from "./player/PlayerLoadingOverlay";
import { PlayerErrorOverlay } from "./player/PlayerErrorOverlay";

// Custom Hooks
import { useTorrentStatus } from "../hooks/useTorrentStatus";
import { usePlayerMetadataAndTracks } from "../hooks/usePlayerMetadataAndTracks";
import { usePlayerInactivity } from "../hooks/usePlayerInactivity";
import { usePlayerFullscreen } from "../hooks/usePlayerFullscreen";
import { usePlayerKeyboardControls } from "../hooks/usePlayerKeyboardControls";
import { useHlsPlayer } from "../hooks/useHlsPlayer";

interface WebMediaPlayerProps {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = ({
  playback,
  onClose,
  isNetworkOffline = false,
}) => {
  const { t } = useTranslation("player");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { playVideo } = usePlayback();

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem("potok_player_volume");
    return saved !== null ? Number(saved) : 0.75;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem("potok_player_muted") === "true";
  });
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  // Menus Visibility State
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  const streamHash = useMemo(() => {
    let hash = playback.streamHash;
    if (!hash) {
      const hashMatch = playback.streamUrl.match(/\/(?:stream|torrents)\/([a-f0-9]{40})/i);
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
    const pathMatch = playback.streamUrl.match(/\/(?:stream|torrents)\/[a-f0-9]+(?:\/files)?\/(\d+)/i);
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

  // Hook: Metadata and tracks (audio/subtitle)
  const {
    audioTracks,
    setAudioTracks,
    currentAudioTrack,
    setCurrentAudioTrack,
    subtitleTracks,
    currentSubtitleTrack,
    setCurrentSubtitleTrack,
    injectedSubtitles,
    isMetadataLoading,
    setIsMetadataLoading,
    metadataDuration,
    isMetadataFetched,
    syncNativeTextTracks,
    localIntroRange,
    localOutroRange,
  } = usePlayerMetadataAndTracks(streamHash, fileIndex, playback.streamUrl, playback.audios);

  // Hook: Torrent metadata parsing & download speed tracker
  const {
    torrentPeers,
    torrentDownloadSpeed,
    hasPositivePeersTime,
  } = useTorrentStatus(streamHash, isMetadataLoading);

  const handleClose = useCallback(() => {
    setIsClosed(true);
    onClose?.();
  }, [onClose]);

  // Hook: Inactivity fade-out manager
  const {
    controlsVisible,
    handleUserActivity,
  } = usePlayerInactivity(videoRef);

  // Hook: Fullscreen API manager
  const {
    isFullscreen,
    toggleFullscreen,
  } = usePlayerFullscreen(overlayRef);

  const [seekOffset, setSeekOffset] = useState(0);

  const seekOffsetRef = useRef(seekOffset);
  useEffect(() => {
    seekOffsetRef.current = seekOffset;
  }, [seekOffset]);

  const handleRefreshStream = useCallback(() => {
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const video = videoRef.current;
    const currentLoc = video ? video.currentTime : 0;
    const seekedTime = seekOffsetRef.current > 0 ? (seekOffsetRef.current + currentLoc) : currentLoc;
    
    localStorage.setItem(resumeKey, Math.floor(seekedTime).toString());

    if (playback.providerId) {
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

  const {
    hlsRef,
    srcResetCounter,
    rawLevels,
    hlsActiveLevel,
    currentQualityLevel,
    setCurrentQualityLevel,
  } = useHlsPlayer({
    videoRef,
    playback,
    currentAudioTrack,
    setCurrentAudioTrack,
    setAudioTracks,
    syncNativeTextTracks,
    setSeekOffset,
    setPlayerError,
    handleRefreshStream,
    setIsMetadataLoading,
  });

  // Hotkeys custom hook listener
  usePlayerKeyboardControls({
    videoRef,
    seekOffset,
    handleSeek: (time) => handleSeek(time),
    handleClose,
    handleUserActivity,
  });

  // Track Synchronization and effects
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === currentSubtitleTrack ? "showing" : "disabled";
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentSubtitleTrack, injectedSubtitles, srcResetCounter]);

  // Close menus reactively on controls hide
  useEffect(() => {
    if (!controlsVisible) {
      setShowAudioMenu(false);
      setShowSubtitleMenu(false);
      setShowQualityMenu(false);
      setShowPlaylistMenu(false);
    }
  }, [controlsVisible]);

  // Resume Toast effect
  useEffect(() => {
    if (isMetadataLoading) return;
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const savedResume = localStorage.getItem(resumeKey);
    if (savedResume && !showResumeToast) {
      const parsed = Number(savedResume);
      if (!isNaN(parsed) && parsed > 15) {
        setResumeTime(parsed);
        setShowResumeToast(true);
        const timer = setTimeout(() => setShowResumeToast(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isMetadataLoading, playback.id, playback.season, playback.episode]);

  useEffect(() => {
    setIsClosed(false);
  }, [playback.streamUrl]);

  // Sync volume and muted state to native video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [srcResetCounter]);

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
      playPlaylistItem(playback.playlistIndex + 1);
    }
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;
    const gatewayBase = ApiClient.baseURL;
    const diagnosticUrl = getProxyUrl(playback.streamUrl, gatewayBase, playback.headers);
    fetch(diagnosticUrl, { method: "HEAD" })
      .then((res) => {
        if (res.status === 403 || res.status === 401) setPlayerError(t("playback.accessRestricted"));
        else if (res.status === 410) handleRefreshStream();
        else setPlayerError(t("playback.loadFailed"));
      })
      .catch(() => setPlayerError(t("playback.loadFailed")))
      .finally(() => setIsMetadataLoading(false));
  };

  // Helper seeks, switches and uploads
  const switchAudio = (id: number) => {
    const video = videoRef.current;
    if (!video) return;

    const normalizedUrl = normalizeStreamUrlToPath(playback.streamUrl);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd", "m4v"].includes(ext) : false;

    const isStreamServer = normalizedUrl.includes("/stream/") || normalizedUrl.includes("/torrents/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const needsRemux = isStreamServer && (isNonNative || id > 0 || playback.streamUrl.includes("remux=true") || normalizedUrl.includes("remux=true"));
    const time = video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;

    let newUrl = "";
    if (needsRemux) {
      setSeekOffset(time);
      newUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(time).toString(),
        audio: id !== -1 ? id.toString() : "0"
      });
    } else {
      setSeekOffset(0);
      newUrl = playback.audios && playback.audios[id] ? playback.audios[id].url : playback.streamUrl;
      if (isStreamServer) {
        try {
          const parsed = new URL(newUrl);
          parsed.searchParams.delete("remux");
          parsed.searchParams.delete("start");
          parsed.searchParams.delete("audio");
          newUrl = parsed.toString();
        } catch {
          newUrl = newUrl.split("?")[0];
        }
      }
    }

    if (video) {
      video.pause();
      video.src = getProxyUrl(newUrl, ApiClient.baseURL, playback.headers);
      video.play().then(() => {
        if (!needsRemux) video.currentTime = time;
        syncNativeTextTracks(video);
      }).catch(() => {});
    }

    setCurrentAudioTrack(id);
    setShowAudioMenu(false);
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const normalizedUrl = normalizeStreamUrlToPath(playback.streamUrl);
    const ext = getFileExtension(normalizedUrl);
    const isNonNative = ext ? !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd", "m4v"].includes(ext) : false;

    const isStreamServer = normalizedUrl.includes("/stream/") || normalizedUrl.includes("/torrents/") || !!(playback.streamHash || (playback as any)["torrentHash"]);
    const needsRemux = isStreamServer && (isNonNative || currentAudioTrack > 0 || playback.streamUrl.includes("remux=true") || normalizedUrl.includes("remux=true"));

    if (needsRemux) {
      setSeekOffset(time);
      let newUrl = updateStreamUrlParams(normalizedUrl, {
        remux: "true",
        start: Math.floor(time).toString(),
        audio: currentAudioTrack !== -1 ? currentAudioTrack.toString() : "0"
      });
      const proxiedUrl = getProxyUrl(newUrl, ApiClient.baseURL, playback.headers);
      video.pause();
      video.src = proxiedUrl;
      video.play().then(() => syncNativeTextTracks(video)).catch(() => {});
    } else {
      setSeekOffset(0);
      video.currentTime = time;
    }
  };

  const switchSubtitle = (id: number) => {
    const video = videoRef.current;
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === id ? "showing" : "disabled";
      }
    }
    setCurrentSubtitleTrack(id);
    setShowSubtitleMenu(false);
  };

  const switchQuality = (id: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id;
      setCurrentQualityLevel(id);
    }
    setShowQualityMenu(false);
  };

  const handleUploadSubtitle = (file: File) => {
    const video = videoRef.current;
    if (video) {
      loadExternalSubtitle(video, file, (newIndex) => {
        syncNativeTextTracks(video);
        if (newIndex !== -1) switchSubtitle(newIndex);
      });
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) { handleUserActivity(); if (video.paused) video.play().catch(() => {}); else video.pause(); }
  };

  const displayDuration = metadataDuration > 0 ? metadataDuration : (duration || 100);

  const displayQualityLevels = useMemo(() => {
    if (rawLevels.length === 0) return [];
    const activeLevel = hlsActiveLevel >= 0 ? rawLevels.find(l => l.id === hlsActiveLevel) : null;
    const autoLabel = activeLevel?.height ? t("quality.autoWithHeight", { height: activeLevel.height }) : t("quality.auto");
    return [{ id: -1, name: autoLabel }, ...rawLevels.map((l) => ({ id: l.id, name: l.height ? `${l.height}p` : t("quality.levelNumbered", { number: l.id + 1 }) }))];
  }, [rawLevels, hlsActiveLevel, t]);

  const { introRange: remoteIntro, outroRange: remoteOutro } = useTimecodes(playback.id, playback.season, playback.episode, playback.mediaType === "tv", displayDuration);
  const introRange = localIntroRange || remoteIntro;
  const outroRange = localOutroRange || remoteOutro;
  
  usePlaybackTracker({
    videoRef,
    playback: useMemo(() => ({ id: playback.id, mediaType: playback.mediaType, season: playback.season, episode: playback.episode }), [playback.id, playback.mediaType, playback.season, playback.episode]),
    seekOffset,
    isActive: isPlaying,
    duration: displayDuration,
  });

  const loadingState = useMemo(() => {
    if (!isMetadataLoading) return null;
    if (!playback.streamUrl.includes("/stream/") && !playback.streamHash) return { title: t("loading.init.title"), subtitle: t("loading.init.loadingStream"), step: 4 };
    if (torrentPeers === null || torrentPeers === 0) return { title: t("loading.peers.title"), subtitle: t("loading.peers.subtitle"), step: 1 };
    if (!isMetadataFetched && !(hasPositivePeersTime && (Date.now() - hasPositivePeersTime > 3000))) {
      return { title: t("loading.preparing.title"), subtitle: t("loading.preparing.subtitle", { peers: torrentPeers, speed: (torrentDownloadSpeed ? torrentDownloadSpeed / 1024 / 1024 : 0).toFixed(1) }), step: 2 };
    }
    if (!isMetadataFetched) return { title: t("loading.tracks.title"), subtitle: t("loading.tracks.subtitle"), step: 3 };
    return { title: t("loading.init.title"), subtitle: t("loading.init.subtitle"), step: 4 };
  }, [isMetadataLoading, playback.streamUrl, playback.streamHash, torrentPeers, torrentDownloadSpeed, isMetadataFetched, hasPositivePeersTime, t]);

  // Sub-renders to limit direct JSX to ≤ 60 lines
  const renderOverlays = () => (
    <>
      {showResumeToast && <PlayerResumeToast resumeTime={resumeTime} onSeek={handleSeek} onClose={() => setShowResumeToast(false)} />}
      {isMetadataLoading && loadingState && <PlayerLoadingOverlay loadingState={loadingState} onClose={handleClose} />}
      {playerError && <PlayerErrorOverlay error={playerError} streamUrl={playback.streamUrl} onRefresh={handleRefreshStream} onClose={handleClose} />}
      {isNetworkOffline && (
        <div className="player-network-offline-banner">
          <AlertTriangle size="1.125rem" />
          <span>{t("offline.banner")}</span>
        </div>
      )}
    </>
  );

  const renderVideo = () => (
    <div className="artplayer-video-container" onClick={togglePlay} onDoubleClick={toggleFullscreen}>
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => { setIsPlaying(true); setIsMetadataLoading(false); }}
        onCanPlay={() => setIsMetadataLoading(false)}
        onPause={() => setIsPlaying(false)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          const video = e.currentTarget;
          setVolume(video.volume);
          setIsMuted(video.muted);
          localStorage.setItem("potok_player_volume", video.volume.toString());
          localStorage.setItem("potok_player_muted", video.muted.toString());
        }}
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
            src={currentSubtitleTrack === index ? track.src : ""}
            default={currentSubtitleTrack === index}
          />
        ))}
      </video>
    </div>
  );

  const renderControls = () => (
    <>
      <PlayerTopBar title={playback.title} mediaType={playback.mediaType} season={playback.season} episode={playback.episode} onClose={handleClose} visible={controlsVisible} />
      <SkipIntroButton videoRef={videoRef} seekOffset={seekOffset} introRange={introRange} displayDuration={displayDuration} onSeek={handleSeek} />
      <SkipOutroButton videoRef={videoRef} seekOffset={seekOffset} outroRange={outroRange} displayDuration={displayDuration} onSeek={handleSeek} />
      <PlayerStatsHUD showStats={showStats} videoRef={videoRef} hlsRef={hlsRef} isPlaying={isPlaying} streamUrl={playback.streamUrl} streamHash={playback.streamHash || ""} duration={displayDuration} onClose={() => setShowStats(false)} />
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
    </>
  );

  if (isClosed) return null;

  return createPortal(
    <div 
      ref={overlayRef}
      className={`web-player-overlay ${!controlsVisible ? "controls-hidden" : ""}`}
      onMouseMove={handleUserActivity}
      onClick={() => { handleUserActivity(); setShowAudioMenu(false); setShowSubtitleMenu(false); setShowQualityMenu(false); setShowPlaylistMenu(false); }}
    >
      {renderOverlays()}
      {renderVideo()}
      {renderControls()}
    </div>,
    document.body
  );
};
