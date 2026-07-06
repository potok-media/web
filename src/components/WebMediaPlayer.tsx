import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { usePlayback, type ActivePlayback } from "../context/AppSettingsContext";
import { PlayerTopBar } from "./player/PlayerTopBar";
import { PlayerStatsHUD } from "./player/PlayerStatsHUD";
import { PlayerControls } from "./player/PlayerControls";
import { convertSrtToVtt, detectSubtitleKind, type SubtitleKind } from "../utils/SubtitleHelper";
import { logger } from "../utils/logger"; // [HLS-DIAG] temporary — remove with the diagnostics
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
import type { PlaybackInfo } from "@potok/sdk-types";

// Components
import { SkipIntroButton } from "./player/SkipIntroButton";
import { SkipOutroButton } from "./player/SkipOutroButton";
import { PlayerResumeToast } from "./player/PlayerResumeToast";
import { PlayerLoadingOverlay } from "./player/PlayerLoadingOverlay";
import { PlayerErrorOverlay } from "./player/PlayerErrorOverlay";
import { PlayerBufferingSpinner } from "./player/PlayerBufferingSpinner";

// Custom Hooks
import { usePlaybackStatus } from "../hooks/usePlaybackStatus";
import { usePlayerMetadataAndTracks, SUBTITLE_WINDOW_SEC } from "../hooks/usePlayerMetadataAndTracks";
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
  // Coherent seek/buffer machine: `seekPreview` pins the UI (slider/clock) to the seek target and
  // hides subtitles while an in-flight seek loads; `isBuffering` (+ delayed `showSpinner`) drives a
  // mid-playback spinner. Both are settled by the video's seeked/playing/canplay events.
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTracksRef = useRef<number[]>([]);
  // Seek debounce (TV-style): rapid ±N presses accumulate into one target and commit ~once the user
  // stops, so the backend gets a single seek instead of one request per press.
  const pendingSeekRef = useRef<number | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Identity comes straight from the plugin descriptor — the player never parses it out of a URL.
  const streamHash = useMemo(() => (playback.streamHash || "").toLowerCase(), [playback.streamHash]);
  const fileIndex = playback.fileIndex || "";

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
    fetchSubtitleWindow,
  } = usePlayerMetadataAndTracks(streamHash, fileIndex, playback.streamUrl, playback.audios, playback);

  // Hook: generic warm-up status. The plugin supplies session.statusUrl; the player polls it and reads a
  // provider-neutral shape (connected/bytesPerSec) — no backend URL or "torrent" knowledge in the player.
  const {
    connected,
    bytesPerSec,
    hasProgressSince,
  } = usePlaybackStatus(playback.session, isMetadataLoading);

  const displayDuration = metadataDuration > 0 ? metadataDuration : (duration || 100);

  // Hook: Playback progress tracker
  const { saveProgress } = usePlaybackTracker({
    videoRef,
    playback: useMemo(() => ({ id: playback.id, mediaType: playback.mediaType, season: playback.season, episode: playback.episode }), [playback.id, playback.mediaType, playback.season, playback.episode]),
    seekOffset,
    isActive: isPlaying,
    duration: displayDuration,
  });

  // Stable playback-session id for this player instance — the presence key the backend refcounts
  // torrent + ffmpeg-producer lifetime by (Jellyfin/Plex model). One uuid per open player.
  const playSessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  );

  // Explicit teardown when we leave — the backend releases our producer/torrent at once instead of
  // waiting for the keepalive to lapse. sendBeacon survives page unload (tab close / navigation).
  const stopBackendSession = useCallback(() => {
    const stopUrl = playback.session?.stopUrl;
    if (!stopUrl) return;
    try {
      const sep = stopUrl.includes("?") ? "&" : "?";
      navigator.sendBeacon(`${stopUrl}${sep}sessionId=${encodeURIComponent(playSessionIdRef.current)}`);
    } catch {
      /* noop */
    }
  }, [playback.session?.stopUrl]);

  const handleClose = useCallback(() => {
    saveProgress();
    stopBackendSession();
    setIsClosed(true);
    onClose?.();
  }, [onClose, saveProgress, stopBackendSession]);

  // Tab close / navigate-away: handleClose (the X button) and React unmount don't reliably fire, so
  // beacon the teardown on pagehide too. (The keepalive lapse is the crash backstop.)
  useEffect(() => {
    window.addEventListener("pagehide", stopBackendSession);
    return () => window.removeEventListener("pagehide", stopBackendSession);
  }, [stopBackendSession]);

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

  const sendKeepalive = useCallback(() => {
    // The plugin (coupled to its backend) supplies the endpoint + identity; the player is provider-
    // agnostic. No session → nothing to keep alive. No JSON Content-Type → CORS-simple (no preflight).
    // Audio is NOT part of the session identity anymore — renditions are per-track HLS playlists the
    // backend produces lazily on request; the session only owns torrent lifetime.
    const session = playback.session;
    if (!session?.keepaliveUrl) return;
    fetch(session.keepaliveUrl, {
      method: "POST",
      body: JSON.stringify({
        sessionId: playSessionIdRef.current,
        hash: (session.hash || streamHash || "").toLowerCase(),
        file: session.file || fileIndex,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [playback.session, streamHash, fileIndex]);

  // Ping immediately (registers the session before the first segment → startup grace), then on interval.
  useEffect(() => {
    if (!playback.session?.keepaliveUrl) return;
    sendKeepalive();
    const ms = (playback.session.intervalSec || 7) * 1000;
    const id = setInterval(sendKeepalive, ms);
    return () => clearInterval(id);
  }, [sendKeepalive, playback.session?.keepaliveUrl, playback.session?.intervalSec]);

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
    handleSeekBy: (delta) => handleSeekBy(delta),
    handleClose,
    handleUserActivity,
  });

  const octopusRef = useRef<any>(null);

  // Blob URLs for non-ASS (vtt/srt) subtitle tracks, built from prefetched text so that
  // selecting a track never triggers a network round-trip. Keyed by track.id.
  const subtitleBlobUrls = useRef<Record<string, string>>({});
  const [, setSubtitleBlobVersion] = useState(0);

  // Per-track readiness ("content actually usable"), keyed by the stable string track id.
  // Absent = still loading, "ready" = displayable now, "error" = fetch failed. Drives the
  // subtitle button spinner/disabled state and per-row spinners in the dropdown.
  const [subtitleState, setSubtitleState] = useState<Record<string, "ready" | "error">>({});
  // Generation guard: an in-flight fetch from a previous source must not mark a track of the new
  // source ready (synthesized ids like `${relIndex}_${title}` can collide across sources).
  const subtitleGen = useRef(0);
  useEffect(() => {
    subtitleGen.current++;
    setSubtitleState({});
  }, [srcResetCounter]);
  const markSubtitle = useCallback((id: string, val: "ready" | "error", gen: number) => {
    setSubtitleState((prev) => {
      if (gen !== subtitleGen.current) return prev;
      if (prev[id] === val) return prev;
      return { ...prev, [id]: val };
    });
  }, []);

  // Build blob URLs for every non-ASS track as soon as its prefetch promise resolves, and record
  // per-track readiness. Native (vtt/srt) counts as "ready" only once its blob URL exists — until
  // then the <track> would fall back to the remote URL (the select-but-broken case). ASS is "ready"
  // as soon as its content resolves (SubtitlesOctopus loads the text directly). A failed fetch marks
  // "error" so the row stops spinning instead of hanging. Uploads/URL tracks are marked ready
  // synchronously in addSubtitleTrack.
  useEffect(() => {
    let active = true;
    const gen = subtitleGen.current;
    injectedSubtitles.forEach((track) => {
      if (!track.src) return;
      const isAss = track.codec === "ass" || track.codec === "ssa";
      const promise = subtitleFetchPromises.current[track.id];

      if (isAss) {
        if (!promise) return;
        promise
          .then(() => { if (active) markSubtitle(track.id, "ready", gen); })
          .catch(() => { if (active) markSubtitle(track.id, "error", gen); });
        return;
      }

      if (subtitleBlobUrls.current[track.id]) {
        markSubtitle(track.id, "ready", gen);
        return;
      }
      if (!promise) return;
      promise
        .then((text: string) => {
          if (!active) return;
          if (!subtitleBlobUrls.current[track.id]) {
            const vtt = text.trimStart().startsWith("WEBVTT") ? text : convertSrtToVtt(text);
            const blob = new Blob([vtt], { type: "text/vtt" });
            subtitleBlobUrls.current[track.id] = URL.createObjectURL(blob);
            setSubtitleBlobVersion((v) => v + 1);
          }
          markSubtitle(track.id, "ready", gen);
        })
        .catch(() => { if (active) markSubtitle(track.id, "error", gen); });
    });
    return () => {
      active = false;
    };
    // currentSubtitleTrack is a dep because content is now fetched lazily on selection — the
    // selected track's promise appears only after it is picked, so re-run to build its blob then.
  }, [injectedSubtitles, markSubtitle, currentSubtitleTrack]);

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
          fallbackFont: "/fonts/subtitle-fallback.woff2",
          // Remuxed output is 0-based; ASS timestamps are absolute. Offset libass by seekOffset
          // (the real keyframe start) so subtitles line up with the seeked video.
          timeOffset: seekOffsetRef.current,
          debug: true,
        });
      } catch (err: any) {
        console.error("[OCTOPUS] Failed to initialize SubtitlesOctopus:", err);
      }
    }

    // Uploaded / URL ASS carries its full text in memory (subtitleFetchPromises) — load it directly.
    // Backend torrent ASS streams in per-window via the windowed feeder effect below, so we do NOT
    // fetch a full document here — that would be exactly the whole-file demux we're eliminating.
    let active = true;
    const isUpload = selectedTrack!.src.startsWith("blob:");
    if (isUpload) {
      const currentPromise = subtitleFetchPromises.current[selectedTrack!.id];
      currentPromise?.then((text: string) => {
        if (!active) return;
        const oct = octopusRef.current;
        if (oct) {
          try {
            oct.freeTrack();
          } catch {
            /* noop */
          }
          oct.setTrack(text);
          try {
            oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
          } catch (e) {
            console.error("[OCTOPUS] setCurrentTime after setTrack failed:", e);
          }
        }
      }).catch((err: any) => {
        console.error("[OCTOPUS] Error resolving subtitle promise:", err);
      });
    }

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

  // Spinner is delayed so quick in-buffer seeks (which resolve in well under this) never flash it;
  // a genuinely cold seek or a network dip keeps buffering past the delay and shows it.
  useEffect(() => {
    if (isBuffering) {
      spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), 350);
    } else {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
      setShowSpinner(false);
    }
    return () => {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    };
  }, [isBuffering]);

  // Cancel any pending debounced seek on unmount so it can't fire against a torn-down video.
  useEffect(() => () => {
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
  }, []);

  // Hide subtitles while a seek is in flight (the visible frame is the old/black one), and bring
  // them back — redrawn at the resumed position — the instant the seek settles, so subtitles never
  // appear over the wrong frame and land in sync with the picture.
  useEffect(() => {
    const seeking = seekPreview != null;
    const oct = octopusRef.current;
    const video = videoRef.current;
    if (oct?.canvas) {
      (oct.canvas as HTMLElement).classList.toggle("player-subs-hidden", seeking);
    }
    if (!video) return;
    if (seeking) {
      const hidden: number[] = [];
      Array.from(video.textTracks).forEach((tt, i) => {
        if (tt.mode === "showing") {
          tt.mode = "hidden";
          hidden.push(i);
        }
      });
      hiddenTracksRef.current = hidden;
    } else {
      hiddenTracksRef.current.forEach((i) => {
        const tt = video.textTracks[i];
        if (tt && tt.mode === "hidden") tt.mode = "showing";
      });
      hiddenTracksRef.current = [];
      if (oct) {
        try {
          oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
        } catch {
          /* noop */
        }
      }
    }
  }, [seekPreview]);

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

  // ── Windowed subtitle feeder ──────────────────────────────────────────────────────────────────
  // For the SELECTED backend (torrent) track, stream subtitles ~2 min at a time as playback moves,
  // instead of demuxing the whole file. Each window is fetched with ?start=<bucket>; the backend seeks
  // straight to it (only pieces playback already has) and returns cues with ABSOLUTE timestamps.
  //   VTT/SRT: accumulate via addCue, deduped across the small window overlap.
  //   ASS:     swap the current window's document into libass on each bucket crossing (overlap keeps
  //            on-screen lines across the swap).
  // Uploaded/URL subs (blob: src) are untouched here — the native-track / octopus paths handle them.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const trackIndex = currentSubtitleTrack;
    const sel = trackIndex !== -1 ? injectedSubtitles[trackIndex] : null;
    if (!sel || !sel.src || sel.src.startsWith("blob:")) return;

    const isAss = sel.codec === "ass" || sel.codec === "ssa";
    const gen = subtitleGen.current;
    const W = SUBTITLE_WINDOW_SEC;
    let cancelled = false;

    const requested = new Set<number>();          // buckets a fetch was kicked off for
    const fedVtt = new Set<number>();             // buckets whose cues were added
    const vttKeys = new Set<string>();            // cue dedup across overlapping windows
    const windowText = new Map<number, string>(); // bucket → resolved doc (used by ASS)
    let assBucket = -1;                           // bucket currently loaded into libass
    let firstReady = false;

    const tt = !isAss ? video.textTracks[trackIndex] : null;
    // Re-selecting a track must not double-add cues from a prior mount.
    if (tt && tt.cues) {
      Array.from(tt.cues).forEach((c) => {
        try { tt.removeCue(c as TextTrackCue); } catch { /* noop */ }
      });
    }

    const parseTs = (s: string): number => {
      const m = s.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
      if (!m) return NaN;
      return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
    };
    const addVttCues = (text: string) => {
      if (!tt) return;
      const lines = text.replace(/\r/g, "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("-->") === -1) continue;
        const [a, b] = lines[i].split("-->");
        const start = parseTs(a);
        const end = parseTs((b || "").trim().split(/\s+/)[0] || "");
        i++;
        const body: string[] = [];
        while (i < lines.length && lines[i].trim() !== "") { body.push(lines[i]); i++; }
        if (!isFinite(start) || !isFinite(end) || end <= start) continue;
        const textBody = body.join("\n");
        const key = `${start.toFixed(3)}-${end.toFixed(3)}-${textBody}`;
        if (vttKeys.has(key)) continue;
        vttKeys.add(key);
        try {
          const cue = new VTTCue(start, end, textBody);
          cueOriginalTimes.current.set(cue, { s: start, e: end });
          tt.addCue(cue);
        } catch { /* noop */ }
      }
    };
    const applyAss = () => {
      if (!isAss || cancelled) return;
      const cur = Math.floor(video.currentTime / W) * W;
      if (cur === assBucket) return;
      const doc = windowText.get(cur);
      if (doc == null) return;
      const oct = octopusRef.current;
      if (!oct) return;
      assBucket = cur;
      try { oct.freeTrack(); } catch { /* noop */ }
      try {
        oct.setTrack(doc);
        oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
      } catch { /* noop */ }
    };
    const fetchBucket = (bucket: number) => {
      if (bucket < 0 || requested.has(bucket)) return;
      requested.add(bucket);
      const p = fetchSubtitleWindow(sel, bucket);
      if (!p) { requested.delete(bucket); return; }
      p.then((text) => {
        if (cancelled) return;
        windowText.set(bucket, text);
        if (!isAss && !fedVtt.has(bucket)) { fedVtt.add(bucket); addVttCues(text); }
        if (!firstReady) { firstReady = true; markSubtitle(sel.id, "ready", gen); }
        applyAss();
      }).catch(() => {
        // Cold-ahead window (pieces not down yet) — allow a retry on the next tick.
        requested.delete(bucket);
      });
    };
    const tick = () => {
      if (cancelled) return;
      const t = video.currentTime;
      const cur = Math.floor(t / W) * W;
      fetchBucket(cur);
      if (t - cur > W - 20) fetchBucket(cur + W); // prefetch the next window near the seam
      applyAss();
    };

    tick();
    const iv = window.setInterval(tick, 1000);
    const onSeeked = () => tick();
    video.addEventListener("seeked", onSeeked);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [currentSubtitleTrack, injectedSubtitles, fetchSubtitleWindow, markSubtitle]);

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

  const playPlaylistItem = async (index: number) => {
    if (!playback.playlist || index < 0 || index >= playback.playlist.length) return;
    const item = playback.playlist[index];

    // Lazy re-fetch a FRESH descriptor (session/subtitles/audios) for the next episode via the host
    // bridge — the pre-built playlist item carries only identity, no session/subs, so replaying it would
    // silently break subtitles + the keepalive/session for episode 2+. Same player instance → same
    // session id; the next keepalive reports the new file and the backend reconciles the old producer.
    const resolve = (window as any).potok_playlist_resolve as ((it: any) => Promise<PlaybackInfo>) | undefined;
    if (typeof resolve === "function") {
      try {
        const info = await resolve(item);
        if (info) {
          const st = info.streamType;
          playVideo({
            ...playback,
            streamUrl: info.streamUrl,
            streamType: (st === "m3u8" || st === "hls" || st === "mp4" || st === "dash") ? st : undefined,
            streamHash: info.torrentHash,
            fileIndex: info.fileIndex,
            audios: info.audios?.map((a) => ({ name: a.name, url: a.url })),
            headers: info.headers,
            subtitles: info.subtitles,
            session: info.session,
            duration: info.duration,
            introStart: info.introStart,
            introEnd: info.introEnd,
            outroStart: info.outroStart,
            outroEnd: info.outroEnd,
            season: item.season,
            episode: item.episode,
            title: `${item.title} - S${item.season}E${item.episode}`,
            voice: item.voice,
            playlistIndex: index,
          });
          return;
        }
      } catch {
        /* fall through to the stale pre-built item */
      }
    }

    // Fallback: no bridge (e.g. a non-torrent source) → replay the pre-built item as-is.
    playVideo({
      ...playback,
      streamUrl: item.streamUrl,
      streamType: item.streamType,
      season: item.season,
      episode: item.episode,
      title: `${item.title} - S${item.season}E${item.episode}`,
      audios: item?.audios,
      voice: item.voice,
      playlistIndex: index,
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
    // In HLS mode hls.js's own ERROR handler owns recovery + fatal reporting (useHlsPlayer). The raw
    // <video onError> must NOT independently declare a fatal error or probe the URL — that raced with
    // hls.js recovery and turned recoverable stalls into a fatal overlay (the ?remux=true cascade).
    // Native progressive is the only mode where <video onError> is the sole error signal. (Matches the
    // isHls decision in useHlsPlayer, including the legacy no-streamType .m3u8 sniff fallback.)
    const isHls = playback.streamType === "m3u8" || playback.streamType === "hls"
      || (!playback.streamType && (playback.streamUrl.includes(".m3u8") || playback.streamUrl.includes("/hls/")));
    if (isHls) return;
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
    setShowAudioMenu(false);

    const isHls = playback.streamType === "m3u8" || playback.streamType === "hls";
    if (isHls && hlsRef.current) {
      // Native multivariant switch: the manifest carries every audio rendition (EXT-X-MEDIA), so hls.js
      // swaps ONLY the audio SourceBuffer in place — video buffer untouched, no source reload, no black
      // frame. currentAudioTrack is confirmed by the AUDIO_TRACK_SWITCHED event (useHlsPlayer).
      hlsRef.current.audioTrack = id;
      setCurrentAudioTrack(id);
      return;
    }

    // Non-HLS providers (per-track progressive URLs): swap the source and resume in place.
    const video = videoRef.current;
    const time = video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    localStorage.setItem(resumeKey, time.toString());
    setCurrentAudioTrack(id);
    const newUrl = playback.audios && playback.audios[id] ? playback.audios[id].url : playback.streamUrl;
    playVideo({ ...playback, streamUrl: newUrl });
  };

  // Debounced/accumulated seeking. The UI pins to the target instantly (seekPreview), but the real
  // `currentTime` write — the thing that makes hls.js fetch a segment — is deferred, so a burst of
  // ±N presses or a scrub commits only its final target: one backend seek instead of one per press.
  const SEEK_DEBOUNCE_MS = 300;
  const commitSeek = () => {
    seekTimerRef.current = null;
    const t = pendingSeekRef.current;
    pendingSeekRef.current = null;
    const video = videoRef.current;
    if (t == null || !video) return;
    // [HLS-DIAG] Temporary: capture the seek target vs the player's real timeline (seekable/buffered)
    // to diagnose post-seek segment loading. Remove after diagnosis.
    const rng = (tr: TimeRanges) => Array.from({ length: tr.length }, (_, i) => [Number(tr.start(i).toFixed(1)), Number(tr.end(i).toFixed(1))]);
    logger.warn("[HLS-DIAG] commitSeek", {
      target: Number(t.toFixed(2)),
      curr: Number(video.currentTime.toFixed(2)),
      seekable: rng(video.seekable),
      buffered: rng(video.buffered),
    });
    if (Math.abs(video.currentTime - t) > 0.25) {
      // One real seek. onSeeking → buffering/spinner; onSeeked/onPlaying settle & clear seekPreview.
      video.currentTime = t;
    } else {
      // No-op seek (already there): no seeked event will fire, so release the UI pin ourselves.
      setSeekPreview(null);
    }
  };
  const scheduleSeek = (target: number) => {
    const clamped = Math.max(0, Math.min(target, displayDuration > 0 ? displayDuration : target));
    pendingSeekRef.current = clamped;
    setSeekPreview(clamped);
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(commitSeek, SEEK_DEBOUNCE_MS);
  };
  // Absolute seek (slider, skip intro/outro, resume toast).
  const handleSeek = (time: number) => scheduleSeek(time);
  // Relative seek (±N buttons, keyboard arrows). Accumulates off the pending target so five +10s
  // presses land on +50s, not five separate seeks.
  const handleSeekBy = (delta: number) => {
    const video = videoRef.current;
    const base = pendingSeekRef.current != null ? pendingSeekRef.current : seekOffsetRef.current + (video?.currentTime ?? 0);
    scheduleSeek(base + delta);
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

  // Add a manually-provided subtitle (from a file or a URL) as a selectable track. ASS/SSA are kept
  // raw and rendered by libass (codec "ass"); SRT is normalized to WebVTT; VTT passes through — both
  // go through a blob URL on the native <track> path. Registers the blob for revocation on reset.
  const addSubtitleTrack = (displayName: string, rawContent: string, kind: SubtitleKind) => {
    const isAss = kind === "ass";
    const content = isAss ? rawContent : kind === "srt" ? convertSrtToVtt(rawContent) : rawContent;
    const url = URL.createObjectURL(new Blob([content], { type: isAss ? "text/plain" : "text/vtt" }));
    const id = `upload_${displayName}_${url}`;
    const newTrack = {
      id,
      label: `${displayName || t("trackSelector.subtitlesFallback", { index: injectedSubtitles.length + 1 })} (${t("trackSelector.customLabel")})`,
      srclang: "custom",
      src: url,
      codec: isAss ? "ass" : "vtt",
    };
    subtitleBlobUrls.current[id] = url;
    // libass renders ASS from text: pre-store the resolved text so the octopus effect uses it
    // directly instead of fetching `${src}?format=ass` — a blob URL rejects an appended query.
    if (isAss) subtitleFetchPromises.current[id] = Promise.resolve(rawContent);
    // Manually-added tracks are fully in memory → ready immediately (no spinner).
    markSubtitle(id, "ready", subtitleGen.current);
    const newIndex = injectedSubtitles.length;
    setInjectedSubtitles((prev) => [...prev, newTrack]);
    switchSubtitle(newIndex);
  };

  const handleUploadSubtitle = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      const kind = detectSubtitleKind(file.name, content);
      addSubtitleTrack(file.name.replace(/\.(srt|vtt|ass|ssa)$/i, ""), content, kind);
    };
    reader.readAsText(file);
  };

  // Load a subtitle by URL (through the app's HTTP proxy to dodge CORS), detect its format, and add
  // it as a track. Throws on failure so the caller can surface an error inline.
  const handleAddSubtitleUrl = async (rawUrl: string): Promise<void> => {
    const url = rawUrl.trim();
    if (!url) return;
    const res = await fetch(getProxyUrl(url, ApiClient.baseURL));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const content = await res.text();
    const kind = detectSubtitleKind(url, content);
    let name = "";
    try {
      name = decodeURIComponent(new URL(url, window.location.href).pathname.split("/").pop() || "").replace(/\.(srt|vtt|ass|ssa)$/i, "");
    } catch { /* keep empty → fallback label */ }
    addSubtitleTrack(name, content, kind);
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

  // Attach per-track loading/error flags (joined by the stable string id, not the positional index)
  // and a single "still loading" flag for the button icon. In-band native tracks have no stableId and
  // are treated as ready.
  const subtitleTracksUi = useMemo(() => subtitleTracks.map((item) => {
    const st = item.stableId ? subtitleState[item.stableId] : "ready";
    // Content is fetched lazily only for the selected track, so a row spins ONLY while it is the
    // selected one and its content isn't ready yet. Unselected tracks are pickable, not loading.
    const loading = item.id === currentSubtitleTrack && !!item.stableId && !st;
    return { ...item, loading, error: st === "error" };
  }), [subtitleTracks, subtitleState, currentSubtitleTrack]);
  const subtitlesLoading = isMetadataLoading || subtitleTracksUi.some((t) => t.loading);

  const { introRange: remoteIntro, outroRange: remoteOutro } = useTimecodes(playback.id, playback.season, playback.episode, playback.mediaType === "tv", displayDuration);
  const introRange = localIntroRange || remoteIntro;
  const outroRange = localOutroRange || remoteOutro;

  const loadingState = useMemo(() => {
    if (!isMetadataLoading) return null;
    // Non-buffering sources (CDN/instant) skip the warm-up steps → straight to the generic init spinner.
    if (!playback.requiresBuffering) return { title: t("loading.init.title"), subtitle: t("loading.init.loadingStream"), step: 4 };
    if (connected === null || connected === 0) return { title: t("loading.peers.title"), subtitle: t("loading.peers.subtitle"), step: 1 };
    if (!isMetadataFetched && !(hasProgressSince && (Date.now() - hasProgressSince > 3000))) {
      return { title: t("loading.preparing.title"), subtitle: t("loading.preparing.subtitle", { peers: connected, speed: (bytesPerSec ? bytesPerSec / 1024 / 1024 : 0).toFixed(1) }), step: 2 };
    }
    if (!isMetadataFetched) return { title: t("loading.tracks.title"), subtitle: t("loading.tracks.subtitle"), step: 3 };
    return { title: t("loading.init.title"), subtitle: t("loading.init.subtitle"), step: 4 };
  }, [isMetadataLoading, playback.requiresBuffering, connected, bytesPerSec, isMetadataFetched, hasProgressSince, t]);

  // Sub-renders to limit direct JSX to ≤ 60 lines
  const renderOverlays = () => (
    <>
      {showResumeToast && <PlayerResumeToast resumeTime={resumeTime} onSeek={handleSeek} onClose={() => setShowResumeToast(false)} />}
      {isMetadataLoading && loadingState && <PlayerLoadingOverlay loadingState={loadingState} onClose={handleClose} />}
      {showSpinner && !isMetadataLoading && !playerError && <PlayerBufferingSpinner />}
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
        onPlaying={() => { setIsPlaying(true); setIsMetadataLoading(false); setIsBuffering(false); setSeekPreview(null); }}
        onCanPlay={() => { setIsMetadataLoading(false); setIsBuffering(false); }}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => { setIsBuffering(false); setSeekPreview(null); }}
        onWaiting={() => { logger.warn("[HLS-DIAG] waiting", { curr: Number((videoRef.current?.currentTime ?? 0).toFixed(2)), readyState: videoRef.current?.readyState }); setIsBuffering(true); }}
        onStalled={() => logger.warn("[HLS-DIAG] stalled", { curr: Number((videoRef.current?.currentTime ?? 0).toFixed(2)), readyState: videoRef.current?.readyState })}
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
          const isUpload = track.src?.startsWith("blob:");
          // ASS/SSA → rendered by SubtitlesOctopus (libass), no native src. Backend torrent VTT/SRT →
          // cues are fed PROGRAMMATICALLY per-window (VTTCue/addCue) by the windowed feeder, so we give
          // NO src — a src would make the browser fetch the whole-file demux we're eliminating. Only
          // uploads/URL subs keep a native blob-doc src. The empty <track> preserves textTracks index
          // alignment and gives us the TextTrack object to addCue into.
          const src = isAss ? undefined : (isUpload ? (subtitleBlobUrls.current[track.id] || track.src) : undefined);
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
      <PlayerStatsHUD showStats={showStats} videoRef={videoRef} hlsRef={hlsRef} isPlaying={isPlaying} streamUrl={playback.streamUrl} statusUrl={playback.session?.statusUrl || ""} duration={displayDuration} onClose={() => setShowStats(false)} />
      <PlayerControls
        videoRef={videoRef}
        controlsVisible={controlsVisible}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        duration={displayDuration}
        onSeek={handleSeek}
        onSeekBy={handleSeekBy}
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
        subtitleTracks={subtitleTracksUi}
        subtitlesLoading={subtitlesLoading}
        currentSubtitleTrack={currentSubtitleTrack}
        onSelectSubtitleTrack={switchSubtitle}
        showSubtitleMenu={showSubtitleMenu}
        onToggleSubtitleMenu={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowAudioMenu(false); setShowQualityMenu(false); setShowPlaylistMenu(false); }}
        onUploadSubtitle={handleUploadSubtitle}
        onAddSubtitleUrl={handleAddSubtitleUrl}
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
        thumbnails={playback.thumbnails}
        seekPreview={seekPreview}
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
