import { useState, useEffect, useCallback, useRef } from "react";
import { i18n } from "../i18n";
import { type ActivePlayback } from "../context/AppSettingsContext";

// Subtitle window size (seconds). MUST match the backend `subtitleWindowSec` bucket so the client and
// server agree on window boundaries (immutable-cacheable, dedupable). Kept SMALL so each window stays
// within the player's read-ahead (~100-120s) — the backend reads that window's whole interleaved
// container to collect the sparse subtitle packets, so a window bigger than the buffer would pull an
// un-downloaded tail over the network and time out. 30s = cache hits, instant.
export const SUBTITLE_WINDOW_SEC = 15;

function mergeAndDeduplicateSubtitles(
  existing: { id: string; label: string; srclang: string; src: string; codec?: string }[],
  incoming: { id: string; label: string; srclang: string; src: string; codec?: string }[]
) {
  const seenSrc = new Set<string>();
  const seenLabelLang = new Set<string>();
  const merged: { id: string; label: string; srclang: string; src: string; codec?: string }[] = [];

  const add = (sub: { id: string; label: string; srclang: string; src: string; codec?: string }) => {
    const srcKey = sub.src.trim().toLowerCase();
    const labelLangKey = `${sub.label.trim()}_${sub.srclang.trim()}`.toLowerCase();
    if (srcKey && seenSrc.has(srcKey)) return;
    if (labelLangKey && seenLabelLang.has(labelLangKey)) return;
    
    if (srcKey) seenSrc.add(srcKey);
    if (labelLangKey) seenLabelLang.add(labelLangKey);
    merged.push(sub);
  };

  existing.forEach(add);
  incoming.forEach(add);
  return merged;
}

export function usePlayerMetadataAndTracks(
  streamHash: string,
  fileIndex: string,
  initialStreamUrl: string,
  audios?: { name: string; url: string }[],
  playback?: ActivePlayback
) {
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; stableId?: string }[]>(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return playback.subtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || sub.name || `Sub ${idx + 1}`,
        stableId: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
      }));
    }
    return [];
  });
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [injectedSubtitles, setInjectedSubtitles] = useState<{ id: string; label: string; srclang: string; src: string; codec?: string }[]>(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return playback.subtitles.map((sub, idx) => ({
        id: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
        label: sub.label || sub.name || `Sub ${idx + 1}`,
        srclang: sub.srclang || sub.language || "custom",
        src: sub.src || sub.url || "",
        codec: sub.format || (sub as any).codec,
      }));
    }
    return [];
  });

  // Sync subtitleTracks state from injectedSubtitles for instant UI availability
  useEffect(() => {
    setSubtitleTracks((prev) => {
      const injectedTracks = injectedSubtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || `Sub ${idx + 1}`,
        stableId: sub.id,
      }));
      const inbandTracks = prev.filter(t => t.id >= injectedSubtitles.length);
      return [...injectedTracks, ...inbandTracks];
    });
  }, [injectedSubtitles]);
  
  // A TorrentGo stream shows the loading overlay until the HLS manifest/first frame is ready (cleared by
  // the video's canplay/playing events). Track metadata itself is no longer fetched here — the plugin
  // owns it and hands it in via `playback` — so this only gates the initial overlay.
  // Generic warm-up gate: show the loading overlay for streams the plugin flagged as buffering-backed
  // (torrent/live) — no URL-sniffing. Cleared by the video's canplay/playing events.
  const [isMetadataLoading, setIsMetadataLoading] = useState(() => !!playback?.requiresBuffering);
  const [metadataDuration, setMetadataDuration] = useState(() => {
    if (playback?.duration && playback.duration > 0) {
      return playback.duration;
    }
    return 0;
  });
  const [isMetadataFetched, setIsMetadataFetched] = useState(() => {
    return !!(playback?.subtitles && playback.subtitles.length > 0);
  });
  const [localIntroRange, setLocalIntroRange] = useState<{ start: number; end: number } | null>(() => {
    if (playback && typeof playback.introStart === "number" && typeof playback.introEnd === "number" && playback.introEnd > playback.introStart) {
      return { start: playback.introStart, end: playback.introEnd };
    }
    return null;
  });
  const [localOutroRange, setLocalOutroRange] = useState<{ start: number; end: number } | null>(() => {
    if (playback && typeof playback.outroStart === "number" && typeof playback.outroEnd === "number" && playback.outroEnd > playback.outroStart) {
      return { start: playback.outroStart, end: playback.outroEnd };
    }
    return null;
  });

  // Sync Native Text Tracks
  const syncNativeTextTracks = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    
    const inbandTracks: { id: number; name: string; stableId?: string }[] = [];
    for (let i = injectedSubtitles.length; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        inbandTracks.push({
          id: i,
          name: track.label || track.language || i18n.t("player:trackSelector.subtitlesFallback", { index: i + 1 }),
        });
      }
    }

    const injectedTracks = injectedSubtitles.map((sub, idx) => ({
      id: idx,
      name: sub.label || `Sub ${idx + 1}`,
      stableId: sub.id,
    }));
    setSubtitleTracks([...injectedTracks, ...inbandTracks]);
  }, [injectedSubtitles]);

  // Audio track initializer
  useEffect(() => {
    if (audios && audios.length > 0) {
      const tracks = audios.map((a, idx) => ({ id: idx, name: a.name }));
      setAudioTracks(tracks);
      
      let activeIdx = 0;
      try {
        const audioParam = new URL(initialStreamUrl).searchParams.get("audio");
        if (audioParam !== null) {
          const parsed = parseInt(audioParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < audios.length) activeIdx = parsed;
        }
      } catch {
        const match = initialStreamUrl.match(/[?&]audio=(\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 0 && parsed < audios.length) activeIdx = parsed;
        }
      }
      setCurrentAudioTrack(activeIdx);
    }
  }, [audios, initialStreamUrl]);

  const subtitlesJson = JSON.stringify(playback?.subtitles);
  const durationVal = playback?.duration;
  const introStartVal = playback?.introStart;
  const introEndVal = playback?.introEnd;
  const outroStartVal = playback?.outroStart;
  const outroEndVal = playback?.outroEnd;

  // Reset state when the video source (file/stream) changes. The new descriptor is already on `playback`
  // by now (playVideo set it), so tracks are immediately "fetched" — the sync effect below repopulates
  // subtitles/duration from it.
  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
    setMetadataDuration(0);
    setLocalIntroRange(null);
    setLocalOutroRange(null);
    setIsMetadataFetched(true);
  }, [streamHash, fileIndex]);

  // Sync static properties from playback prop to local React states
  useEffect(() => {
    const initialSubs = playback?.subtitles && playback.subtitles.length > 0
      ? playback.subtitles.map((sub, idx) => ({
          id: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
          label: sub.label || sub.name || `Sub ${idx + 1}`,
          srclang: sub.srclang || sub.language || "custom",
          src: sub.src || sub.url || "",
          codec: sub.format || (sub as any).codec,
        }))
      : [];
    
    if (initialSubs.length > 0) {
      setInjectedSubtitles((prev) => mergeAndDeduplicateSubtitles(prev, initialSubs));
    }

    if (playback?.duration && playback.duration > 0) {
      setMetadataDuration(playback.duration);
    }

    if (playback && typeof playback.introStart === "number" && typeof playback.introEnd === "number" && playback.introEnd > playback.introStart) {
      setLocalIntroRange({ start: playback.introStart, end: playback.introEnd });
    }

    if (playback && typeof playback.outroStart === "number" && typeof playback.outroEnd === "number" && playback.outroEnd > playback.outroStart) {
      setLocalOutroRange({ start: playback.outroStart, end: playback.outroEnd });
    }

    // The plugin owns track metadata now (single `/metadata` fetch in getPlaybackInfo). By the time
    // `playback` reaches us the descriptor is complete, so tracks are "fetched" — no player-side fetch.
    setIsMetadataFetched(true);
  }, [subtitlesJson, durationVal, introStartVal, introEndVal, outroStartVal, outroEndVal]);

  // Full-document promises — kept ONLY for locally-uploaded / URL subtitles (already in memory) and
  // as the transparent fallback the backend serves when a container can't be seeked. Backend torrent
  // subtitles no longer populate this; they stream in windows via `fetchSubtitleWindow` below.
  const subtitleFetchPromises = useRef<Record<string, Promise<string> | undefined>>({});

  // Per-(trackId, windowBucket) fetch cache for windowed subtitle slices. The player calls
  // fetchSubtitleWindow(track, bucket) as playback approaches each ~2-min window of the SELECTED track;
  // the backend seeks straight to that slice (reading only pieces playback already has) and returns
  // WebVTT/ASS with ABSOLUTE timestamps. Memoized so re-entering a window (or seeking back) is instant.
  const subtitleWindowPromises = useRef<Record<string, Promise<string>>>({});
  const fetchSubtitleWindow = useCallback((track: { id: string; src: string; codec?: string }, bucket: number) => {
    // Uploads (blob: URLs) carry their own content and don't go through the windowed backend path.
    if (!track?.src || track.src.startsWith("blob:")) return null;
    const key = `${track.id}:${bucket}`;
    const existing = subtitleWindowPromises.current[key];
    if (existing) return existing;

    const isAss = track.codec === "ass" || track.codec === "ssa";
    const format = isAss ? "ass" : "webvtt";
    const url = `${track.src}${track.src.includes("?") ? "&" : "?"}format=${format}&start=${bucket}`;
    const p = fetch(url)
      .then((res) => {
        // 202 = the region isn't downloaded yet (backend didn't spawn ffmpeg into a cold zone). Treat as
        // "not ready" so it's NOT cached as an empty window — the feeder retries as playback nears it.
        if (res.status === 202) throw new Error("subtitle window not ready");
        if (!res.ok) throw new Error("Failed to fetch subtitle window");
        return res.text();
      })
      .catch((err) => {
        // Drop from cache so a cold-ahead window retries once playback nears it.
        delete subtitleWindowPromises.current[key];
        throw err;
      });
    subtitleWindowPromises.current[key] = p;
    return p;
  }, []);

  // Clear both caches when the video source resets.
  useEffect(() => {
    subtitleFetchPromises.current = {};
    subtitleWindowPromises.current = {};
  }, [streamHash, fileIndex]);

  return {
    audioTracks,
    setAudioTracks,
    currentAudioTrack,
    setCurrentAudioTrack,
    subtitleTracks,
    setSubtitleTracks,
    currentSubtitleTrack,
    setCurrentSubtitleTrack,
    injectedSubtitles,
    setInjectedSubtitles,
    isMetadataLoading,
    setIsMetadataLoading,
    metadataDuration,
    isMetadataFetched,
    setIsMetadataFetched,
    syncNativeTextTracks,
    localIntroRange,
    localOutroRange,
    subtitleFetchPromises,
    fetchSubtitleWindow,
  };
}
