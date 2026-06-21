import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "../network/ApiClient";
import { logger } from "../utils/logger";
import { i18n } from "../i18n";

export function usePlayerMetadataAndTracks(
  streamHash: string,
  fileIndex: string,
  initialStreamUrl: string,
  audios?: { name: string; url: string }[]
) {
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [injectedSubtitles, setInjectedSubtitles] = useState<{ id: string; label: string; srclang: string; src: string }[]>([]);
  
  const [isMetadataLoading, setIsMetadataLoading] = useState(() => {
    return initialStreamUrl.includes("/stream") || initialStreamUrl.includes("/torrents/") || !!streamHash;
  });
  const [metadataDuration, setMetadataDuration] = useState(0);
  const [isMetadataFetched, setIsMetadataFetched] = useState(false);
  const [localIntroRange, setLocalIntroRange] = useState<{ start: number; end: number } | null>(null);
  const [localOutroRange, setLocalOutroRange] = useState<{ start: number; end: number } | null>(null);

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

  // Sync with host metadata endpoint
  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
    setLocalIntroRange(null);
    setLocalOutroRange(null);

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
              };
            });
          setInjectedSubtitles(tracksToInject);
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
