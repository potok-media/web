import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { usePlayback, type ActivePlayback } from "../context/AppSettingsContext";
import { PlayerTopBar } from "./player/PlayerTopBar";
import { PlayerStatsHUD } from "./player/PlayerStatsHUD";
import { PlayerControls } from "./player/PlayerControls";
import { convertSrtToVtt } from "../utils/SubtitleHelper";
import { useTimecodes } from "../hooks/useTimecodes";
import { usePlaybackTracker } from "../hooks/usePlaybackTracker";

// @ts-ignore
import SubtitlesOctopus from "libass-wasm";

const MINIMAL_ASS_TEMPLATE = `[Script Info]
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,16,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,1,1,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

// Helpers & Utilities
import { getProxyUrl } from "../utils/playerHelpers";
import {
  parseTorrentGoRef,
  describeStream,
  streamNeedsRemux,
  buildRemuxUrl,
  stripRemuxParams,
  resolveRemuxStart,
} from "../utils/torrentGoStream";

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
  const [seekOffset, setSeekOffset] = useState(0);
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

  const { hash: streamHash, fileIndex } = useMemo(
    () => parseTorrentGoRef(playback.streamUrl, playback.streamHash),
    [playback.streamUrl, playback.streamHash]
  );

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
    setInjectedSubtitles,
    isMetadataLoading,
    setIsMetadataLoading,
    metadataDuration,
    isMetadataFetched,
    syncNativeTextTracks,
    localIntroRange,
    localOutroRange,
    subtitleFetchPromises,
  } = usePlayerMetadataAndTracks(streamHash, fileIndex, playback.streamUrl, playback.audios, playback);

  // Hook: Torrent metadata parsing & download speed tracker
  const {
    torrentPeers,
    torrentDownloadSpeed,
    hasPositivePeersTime,
  } = useTorrentStatus(streamHash, isMetadataLoading);

  const displayDuration = metadataDuration > 0 ? metadataDuration : (duration || 100);

  // Hook: Playback progress tracker
  const { saveProgress } = usePlaybackTracker({
    videoRef,
    playback: useMemo(() => ({ id: playback.id, mediaType: playback.mediaType, season: playback.season, episode: playback.episode }), [playback.id, playback.mediaType, playback.season, playback.episode]),
    seekOffset,
    isActive: isPlaying,
    duration: displayDuration,
  });

  const handleClose = useCallback(() => {
    saveProgress();
    setIsClosed(true);
    onClose?.();
  }, [onClose, saveProgress]);

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

  const octopusRef = useRef<any>(null);

  // Blob URLs for non-ASS (vtt/srt) subtitle tracks, built from prefetched text so that
  // selecting a track never triggers a network round-trip. Keyed by track.id.
  const subtitleBlobUrls = useRef<Record<string, string>>({});
  const [, setSubtitleBlobVersion] = useState(0);

  // Build blob URLs for every non-ASS track as soon as its prefetch promise resolves.
  // This lets the native <track> render instantly from memory instead of hitting the network.
  useEffect(() => {
    let active = true;
    injectedSubtitles.forEach((track) => {
      const isAss = track.codec === "ass" || track.codec === "ssa";
      if (isAss || !track.src) return;
      if (subtitleBlobUrls.current[track.id]) return;
      const promise = subtitleFetchPromises.current[track.id];
      if (!promise) return;
      promise
        .then((text: string) => {
          if (!active || subtitleBlobUrls.current[track.id]) return;
          const vtt = text.trimStart().startsWith("WEBVTT") ? text : convertSrtToVtt(text);
          const blob = new Blob([vtt], { type: "text/vtt" });
          subtitleBlobUrls.current[track.id] = URL.createObjectURL(blob);
          setSubtitleBlobVersion((v) => v + 1);
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [injectedSubtitles]);

  // Revoke blob URLs when the source resets (or on unmount) to avoid leaking memory.
  useEffect(() => {
    return () => {
      Object.values(subtitleBlobUrls.current).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* noop */
        }
      });
      subtitleBlobUrls.current = {};
    };
  }, [srcResetCounter]);

  // Manage SubtitlesOctopus instance and track selection dynamically
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const selectedTrack = currentSubtitleTrack !== -1 ? injectedSubtitles[currentSubtitleTrack] : null;
    const isAss = selectedTrack ? (selectedTrack.codec === "ass" || selectedTrack.codec === "ssa") : false;

    console.log("[OCTOPUS] Effect fired. currentSubtitleTrack:", currentSubtitleTrack, "isAss:", isAss, "octopusRef:", !!octopusRef.current);

    // Set native track modes
    for (let i = 0; i < video.textTracks.length; i++) {
      if (i === currentSubtitleTrack) {
        video.textTracks[i].mode = isAss ? "hidden" : "showing";
      } else {
        video.textTracks[i].mode = "disabled";
      }
    }

    if (!isAss) {
      if (octopusRef.current) {
        console.log("[OCTOPUS] Disposing instance (no ASS track active)");
        try {
          octopusRef.current.dispose();
        } catch (e) {
          console.error("[OCTOPUS] Error disposing:", e);
        }
        octopusRef.current = null;
      }
      return;
    }

    // Ensure SubtitlesOctopus is initialized (init with empty valid template first)
    if (!octopusRef.current) {
      console.log("[OCTOPUS] Initializing SubtitlesOctopus with minimal template");
      try {
        octopusRef.current = new SubtitlesOctopus({
          video,
          subContent: MINIMAL_ASS_TEMPLATE,
          workerUrl: "/assets/subtitles-octopus/subtitles-octopus-worker.js",
          legacyWorkerUrl: "/assets/subtitles-octopus/subtitles-octopus-worker-legacy.js",
          fallbackFont: "/assets/subtitles-octopus/default.woff2",
          // Remuxed output is 0-based; ASS timestamps are absolute. Offset libass by seekOffset
          // (the real keyframe start) so subtitles line up with the seeked video.
          timeOffset: seekOffsetRef.current,
          debug: true,
        });
      } catch (err: any) {
        console.error("[OCTOPUS] Failed to initialize SubtitlesOctopus:", err);
      }
    }

    const subPromise = subtitleFetchPromises.current[selectedTrack!.id];
    let active = true;

    if (!subPromise) {
      // Fallback: If no prefetch promise exists, start one now
      console.log("[OCTOPUS] No prefetch promise found. Starting one now for:", selectedTrack!.label);
      const subUrl = `${selectedTrack!.src}${selectedTrack!.src.includes("?") ? "&" : "?"}format=ass`;
      const fetchPromise = fetch(subUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch subtitle content");
          return res.text();
        });
      subtitleFetchPromises.current[selectedTrack!.id] = fetchPromise;
    }

    const currentPromise = subtitleFetchPromises.current[selectedTrack!.id];

    currentPromise!.then((text: string) => {
      if (!active) return;
      const oct = octopusRef.current;
      if (oct) {
        console.log("[OCTOPUS] Loading resolved track text:", text.length, "chars");
        // Drop whatever is currently on screen BEFORE loading the new track. Otherwise the
        // previous track's line can linger — e.g. switching a full-dialogue track to a sparse
        // "signs" track that has nothing at the current moment, so setTrack never repaints over
        // the old bitmap.
        try {
          oct.freeTrack();
        } catch {
          /* noop */
        }
        oct.setTrack(text);
        // `setTrack` alone does not force a redraw — the worker only re-renders on a
        // `video`/time message. Push the current time immediately so the new track is drawn in
        // sync right away (critical while paused, where no timeupdate fires on its own).
        try {
          oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
        } catch (e) {
          console.error("[OCTOPUS] setCurrentTime after setTrack failed:", e);
        }
      }
    }).catch((err: any) => {
      console.error("[OCTOPUS] Error resolving subtitle promise:", err);
    });

    return () => {
      active = false;
    };
  }, [currentSubtitleTrack, injectedSubtitles]);

  // Clean up SubtitlesOctopus on unmount or source change
  useEffect(() => {
    return () => {
      if (octopusRef.current) {
        console.log("[OCTOPUS] Cleanup on unmount/source change");
        try {
          octopusRef.current.dispose();
        } catch (e) {
          console.error("[OCTOPUS] Error disposing:", e);
        }
        octopusRef.current = null;
      }
    };
  }, [srcResetCounter]);

  // Keep libass (ASS) subtitle timing aligned with the remux seek offset. The remuxed output is
  // 0-based (currentTime starts at the seeked keyframe K) while ASS timestamps are absolute, so
  // we offset libass by seekOffset (= K) and force an immediate redraw.
  useEffect(() => {
    const oct = octopusRef.current;
    const video = videoRef.current;
    if (!oct) return;
    oct.timeOffset = seekOffset;
    if (video) {
      try {
        oct.setCurrentTime(video.currentTime + seekOffset);
      } catch {
        /* noop */
      }
    }
  }, [seekOffset]);

  // Same problem for native (vtt/srt) tracks: the browser times cues off video.currentTime,
  // which is 0-based after a remuxed seek. Shift each cue by seekOffset. We stash each cue's
  // original absolute time in a WeakMap so re-applying is idempotent and survives cue reloads.
  const cueOriginalTimes = useRef<WeakMap<TextTrackCue, { s: number; e: number }>>(new WeakMap());
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyCueOffset = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const inj = injectedSubtitles[i];
        const isAss = inj ? (inj.codec === "ass" || inj.codec === "ssa") : false;
        if (isAss) continue; // ASS is handled by SubtitlesOctopus timeOffset above
        const cues = video.textTracks[i].cues;
        if (!cues) continue;
        for (let j = 0; j < cues.length; j++) {
          const cue = cues[j] as TextTrackCue;
          let orig = cueOriginalTimes.current.get(cue);
          if (!orig) {
            orig = { s: cue.startTime, e: cue.endTime };
            cueOriginalTimes.current.set(cue, orig);
          }
          const ns = orig.s - seekOffset;
          const ne = orig.e - seekOffset;
          if (cue.startTime !== ns) cue.startTime = ns;
          if (cue.endTime !== ne) cue.endTime = ne;
        }
      }
    };

    applyCueOffset();
    // Cues load asynchronously after a <track> src is (re)assigned; re-apply shortly after.
    const timers = [window.setTimeout(applyCueOffset, 150), window.setTimeout(applyCueOffset, 600)];
    return () => timers.forEach((t) => clearTimeout(t));
  }, [seekOffset, currentSubtitleTrack, injectedSubtitles, srcResetCounter]);

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

    const info = describeStream(playback.streamUrl, { streamHash: playback.streamHash, torrentHash: (playback as any).torrentHash });
    const { normalizedUrl } = info;
    const isM3U8 = normalizedUrl.includes(".m3u8") || normalizedUrl.includes("/hls/");

    if (isM3U8) {
      setCurrentAudioTrack(id);
      setShowAudioMenu(false);
      return;
    }

    const needsRemux = streamNeedsRemux(info, playback.streamUrl, id);
    const time = video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;

    // Explicitly write resume timecode to localStorage to bypass < 15s tracker guard
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    localStorage.setItem(resumeKey, time.toString());

    const applyAudio = (newUrl: string) => {
      // Trigger state change in parent to reload progressive stream cleanly
      playVideo({
        ...playback,
        streamUrl: newUrl,
      });
      setCurrentAudioTrack(id);
      setShowAudioMenu(false);
    };

    if (needsRemux) {
      // See handleSeek: 0-based output, so seekOffset = the real keyframe start.
      (async () => {
        const kf = await resolveRemuxStart(streamHash, fileIndex, time);
        setSeekOffset(kf);
        applyAudio(buildRemuxUrl(normalizedUrl, time, id));
      })();
    } else {
      setSeekOffset(0);
      let newUrl = playback.audios && playback.audios[id] ? playback.audios[id].url : playback.streamUrl;
      if (info.isTorrentGoStream) {
        newUrl = stripRemuxParams(newUrl);
      }
      applyAudio(newUrl);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const info = describeStream(playback.streamUrl, { streamHash: playback.streamHash, torrentHash: (playback as any).torrentHash });
    const needsRemux = streamNeedsRemux(info, playback.streamUrl, currentAudioTrack);

    if (needsRemux) {
      saveProgress();
      video.pause();
      // video.currentTime after remux is 0-based (starts at the seeked keyframe K). Resolve the
      // exact K so seekOffset = real start; the seek bar (seekOffset+currentTime) and subtitles
      // (offset by seekOffset) then match. start=time → ffmpeg seeks to keyframe<=time == K.
      (async () => {
        const kf = await resolveRemuxStart(streamHash, fileIndex, time);
        setSeekOffset(kf);
        const newUrl = buildRemuxUrl(info.normalizedUrl, time, currentAudioTrack);
        const proxiedUrl = getProxyUrl(newUrl, ApiClient.baseURL, playback.headers);
        video.src = proxiedUrl;
        video.play().then(() => syncNativeTextTracks(video)).catch(() => {});
      })();
    } else {
      setSeekOffset(0);
      video.currentTime = time;
    }
  };

  const switchSubtitle = (id: number) => {
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
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      const isSrt = file.name.toLowerCase().endsWith(".srt");
      const vtt = isSrt || !content.trimStart().startsWith("WEBVTT") ? convertSrtToVtt(content) : content;
      const url = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
      const id = `upload_${file.name}_${url}`;
      const newTrack = {
        id,
        label: `${file.name.replace(/\.(srt|vtt)$/i, "")} (Загруженные)`,
        srclang: "custom",
        src: url,
        codec: "vtt",
      };
      // Register the blob for revocation on source reset, then hand the track to React
      // state so it survives re-renders (unlike a manual video.appendChild) and shows up
      // in the menu / native <track> render path.
      subtitleBlobUrls.current[id] = url;
      const newIndex = injectedSubtitles.length;
      setInjectedSubtitles((prev) => [...prev, newTrack]);
      switchSubtitle(newIndex);
    };
    reader.readAsText(file);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) { handleUserActivity(); if (video.paused) video.play().catch(() => {}); else video.pause(); }
  };

  const displayQualityLevels = useMemo(() => {
    if (rawLevels.length === 0) return [];
    const activeLevel = hlsActiveLevel >= 0 ? rawLevels.find(l => l.id === hlsActiveLevel) : null;
    const autoLabel = activeLevel?.height ? t("quality.autoWithHeight", { height: activeLevel.height }) : t("quality.auto");
    return [{ id: -1, name: autoLabel }, ...rawLevels.map((l) => ({ id: l.id, name: l.height ? `${l.height}p` : t("quality.levelNumbered", { number: l.id + 1 }) }))];
  }, [rawLevels, hlsActiveLevel, t]);

  const { introRange: remoteIntro, outroRange: remoteOutro } = useTimecodes(playback.id, playback.season, playback.episode, playback.mediaType === "tv", displayDuration);
  const introRange = localIntroRange || remoteIntro;
  const outroRange = localOutroRange || remoteOutro;

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
        {injectedSubtitles.map((track, index) => {
          const isAss = track.codec === "ass" || track.codec === "ssa";
          // ASS/SSA tracks are rendered by SubtitlesOctopus (libass). We keep an empty
          // <track> element to preserve textTracks index alignment, but give it NO src so
          // the browser doesn't fetch a second, uncached webvtt demux from the backend.
          // Non-ASS tracks render from a prefetched blob URL (falling back to the remote
          // URL only until the blob is ready), so switching them is instant and offline-safe.
          const src = isAss ? undefined : (subtitleBlobUrls.current[track.id] || track.src);
          return (
            <track
              key={track.id + "_" + srcResetCounter}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang}
              src={src}
              default={currentSubtitleTrack === index}
            />
          );
        })}
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
