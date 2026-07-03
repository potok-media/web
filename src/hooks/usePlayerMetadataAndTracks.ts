import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "../network/ApiClient";
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
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>([]);
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
    const tracks: { id: number; name: string }[] = [];
    let activeIdx = -1;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        tracks.push({
          id: i,
          name: track.label || track.language || i18n.t("player:trackSelector.subtitlesFallback", { index: i + 1 }),
        });
        if (track.mode === "showing") activeIdx = i;
      }
    }
    setSubtitleTracks(tracks);
    setCurrentSubtitleTrack(activeIdx);
  }, []);

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

  // Sync with host metadata endpoint
  useEffect(() => {
    const initialSubs = playback?.subtitles && playback.subtitles.length > 0
      ? playback.subtitles.map((sub, idx) => ({
          id: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
          label: sub.label || sub.name || `Sub ${idx + 1}`,
          srclang: sub.srclang || sub.language || "custom",
          src: sub.src || sub.url || "",
        }))
      : [];
    setInjectedSubtitles(initialSubs);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);

    if (playback?.duration && playback.duration > 0) {
      setMetadataDuration(playback.duration);
    } else {
      setMetadataDuration(0);
    }

    if (playback && typeof playback.introStart === "number" && typeof playback.introEnd === "number" && playback.introEnd > playback.introStart) {
      setLocalIntroRange({ start: playback.introStart, end: playback.introEnd });
    } else {
      setLocalIntroRange(null);
    }

    if (playback && typeof playback.outroStart === "number" && typeof playback.outroEnd === "number" && playback.outroEnd > playback.outroStart) {
      setLocalOutroRange({ start: playback.outroStart, end: playback.outroEnd });
    } else {
      setLocalOutroRange(null);
    }

    // If playback subtitles are provided, bypass TorrentGo metadata fetch
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
  }, [streamHash, fileIndex, subtitlesJson, durationVal, introStartVal, introEndVal, outroStartVal, outroEndVal]);

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
  };
}
