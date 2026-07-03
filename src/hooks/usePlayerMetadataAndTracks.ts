import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { buildSubtitleSrc } from "../utils/torrentGoStream";
import { logger } from "../utils/logger";
import { i18n } from "../i18n";
import { type ActivePlayback } from "../context/AppSettingsContext";

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
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return playback.subtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || sub.name || `Sub ${idx + 1}`,
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
        name: sub.label || `Sub ${idx + 1}`
      }));
      const inbandTracks = prev.filter(t => t.id >= injectedSubtitles.length);
      return [...injectedTracks, ...inbandTracks];
    });
  }, [injectedSubtitles]);
  
  const [isMetadataLoading, setIsMetadataLoading] = useState(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return false;
    }
    return initialStreamUrl.includes("/stream") || initialStreamUrl.includes("/torrents/") || !!streamHash;
  });
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
    
    const inbandTracks: { id: number; name: string }[] = [];
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
      name: sub.label || `Sub ${idx + 1}`
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

  // Reset state when the video source (file/stream) changes
  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
    setMetadataDuration(0);
    setLocalIntroRange(null);
    setLocalOutroRange(null);
    setIsMetadataFetched(false);
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
  }, [subtitlesJson, durationVal, introStartVal, introEndVal, outroStartVal, outroEndVal]);

  // Fetch metadata from TorrentGo exactly once when the stream/file changes
  useEffect(() => {
    // If playback subtitles are already provided, bypass TorrentGo metadata fetch
    if (playback?.subtitles && playback.subtitles.length > 0) {
      setIsMetadataLoading(false);
      setIsMetadataFetched(true);
      return;
    }

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

          if (typeof metadata.introStart === "number" && typeof metadata.introEnd === "number" && metadata.introEnd > metadata.introStart) {
            setLocalIntroRange({ start: metadata.introStart, end: metadata.introEnd });
          }
          if (typeof metadata.outroStart === "number" && typeof metadata.outroEnd === "number" && metadata.outroEnd > metadata.outroStart) {
            setLocalOutroRange({ start: metadata.outroStart, end: metadata.outroEnd });
          }

          const torrentAudioTracks = metadata.tracks
            .filter((t) => t.type === "audio")
            .map((t) => ({ id: t.index, name: t.title }));
          
          if (torrentAudioTracks.length > 0) {
            setAudioTracks(torrentAudioTracks);
            setCurrentAudioTrack((prev) => (prev === -1 ? torrentAudioTracks[0].id : prev));
          }

          const subtitleMeta = metadata.tracks.filter((t) => t.type === "subtitle");
          // Count how many tracks share each title so we can disambiguate collisions
          // (e.g. a "Полные" RUS track and a "Полные" ENG track) by appending the language.
          const labelCounts = new Map<string, number>();
          subtitleMeta.forEach((t) => {
            const key = (t.title || "").trim().toLowerCase();
            labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
          });

          const tracksToInject = subtitleMeta.map((t) => {
            const srcUrl = buildSubtitleSrc(streamHash, fileIndex, t.relIndex);
            const baseLabel = t.title || `Sub ${t.relIndex + 1}`;
            const key = (t.title || "").trim().toLowerCase();
            const lang = (t.language || "").trim();
            const ambiguous = (labelCounts.get(key) || 0) > 1;
            const label =
              lang && ambiguous && !baseLabel.toLowerCase().includes(lang.toLowerCase())
                ? `${baseLabel} (${lang.toUpperCase()})`
                : baseLabel;
            return {
              id: `${t.relIndex}_${t.title}`,
              label,
              srclang: t.language || "custom",
              src: srcUrl,
              codec: t.codec,
            };
          });
          
          setInjectedSubtitles((prev) => mergeAndDeduplicateSubtitles(prev, tracksToInject));
          setIsMetadataFetched(true);
        }
      } catch (err) {
        logger.warn("Failed to load stream metadata:", err);
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
  }, [streamHash, fileIndex]);

  const subtitleFetchPromises = useRef<Record<string, Promise<string> | undefined>>({});

  // Pre-fetch ALL subtitle contents (ass/ssa + vtt/srt) in the main thread using shared
  // promises so that selecting a track later requires no network round-trip.
  useEffect(() => {
    console.log("[SUB-PREFETCH] Hook effect fired. injectedSubtitles count:", injectedSubtitles.length);
    if (injectedSubtitles.length === 0) return;

    const prefetchTrack = (track: { id: string; label: string; src: string; codec?: string }) => {
      if (!track.src) return;
      // Locally-uploaded subtitles are already in-memory blob URLs — no server fetch needed.
      if (track.src.startsWith("blob:")) return;
      if (subtitleFetchPromises.current[track.id]) {
        console.log(`[SUB-PREFETCH] Track "${track.label}" already has active fetch promise`);
        return;
      }

      const isAss = track.codec === "ass" || track.codec === "ssa";
      const format = isAss ? "ass" : "webvtt";
      const subUrl = `${track.src}${track.src.includes("?") ? "&" : "?"}format=${format}`;
      console.log(`[SUB-PREFETCH] Starting prefetch promise for "${track.label}" (${format}) from URL: ${subUrl}`);

      subtitleFetchPromises.current[track.id] = fetch(subUrl)
        .then((res) => {
          console.log(`[SUB-PREFETCH] Network response for "${track.label}": status=${res.status}, ok=${res.ok}`);
          if (!res.ok) throw new Error("Failed to fetch subtitle content");
          return res.text();
        })
        .then((text) => {
          console.log(`[SUB-PREFETCH] Content loaded for "${track.label}": ${text.length} chars`);
          return text;
        })
        .catch((err) => {
          console.error(`[SUB-PREFETCH] FAILED for "${track.label}":`, err);
          // Remove from cache on failure so it can be retried later
          delete subtitleFetchPromises.current[track.id];
          throw err;
        });
    };

    // Prioritize the currently-selected / default track so the first pick is instant,
    // then warm the rest (they are also being pre-extracted server-side).
    const ordered = [...injectedSubtitles];
    if (currentSubtitleTrack >= 0 && currentSubtitleTrack < ordered.length) {
      const [selected] = ordered.splice(currentSubtitleTrack, 1);
      ordered.unshift(selected);
    }
    ordered.forEach(prefetchTrack);
  }, [injectedSubtitles, currentSubtitleTrack]);

  // Clear prefetch cache when the video source resets
  useEffect(() => {
    console.log("[SUB-PREFETCH] Resetting fetch promises cache");
    subtitleFetchPromises.current = {};
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
  };
}
