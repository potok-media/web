import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getProxyUrl, getFileExtension } from "../utils/playerHelpers";
import { ApiClient } from "../network/ApiClient";
import { type ActivePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";

interface HlsPlayerParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playback: ActivePlayback;
  currentAudioTrack: number;
  setCurrentAudioTrack: (id: number) => void;
  setAudioTracks: (tracks: any[]) => void;
  syncNativeTextTracks: (video: HTMLVideoElement | null) => void;
  setSeekOffset: (offset: number) => void;
  setPlayerError: (error: string | null) => void;
  handleRefreshStream: () => void;
  setIsMetadataLoading: (loading: boolean) => void;
}

export function useHlsPlayer({
  videoRef,
  playback,
  currentAudioTrack: _currentAudioTrack,
  setCurrentAudioTrack,
  setAudioTracks,
  syncNativeTextTracks,
  setSeekOffset,
  setPlayerError,
  handleRefreshStream,
  setIsMetadataLoading,
}: HlsPlayerParams) {
  const hlsRef = useRef<Hls | null>(null);
  const playerSessionRef = useRef<number>(0);
  const autoRefreshCountRef = useRef<number>(0);
  const [srcResetCounter, setSrcResetCounter] = useState(0);

  // Latest Ref Pattern for syncNativeTextTracks to avoid teardown loops
  const syncNativeTextTracksRef = useRef(syncNativeTextTracks);
  syncNativeTextTracksRef.current = syncNativeTextTracks;

  // Quality levels state
  const [rawLevels, setRawLevels] = useState<{ id: number; height?: number }[]>([]);
  const [hlsActiveLevel, setHlsActiveLevel] = useState(-1);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  const handleRefreshStreamRef = useRef(handleRefreshStream);
  useEffect(() => {
    handleRefreshStreamRef.current = handleRefreshStream;
  }, [handleRefreshStream]);

  const cleanupActiveResources = useCallback(() => {
    playerSessionRef.current += 1;
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.src = "";
        video.removeAttribute("src");
        video.load();
      } catch (e) {
        logger.error("[useHlsPlayer] Video teardown error:", e);
      }
    }
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        logger.error("[useHlsPlayer] Hls destroy error:", e);
      }
      hlsRef.current = null;
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    cleanupActiveResources();
    const sessionId = playerSessionRef.current;

    setPlayerError(null);

    const isSmartTV = /web0s|webos|tizen|smarttv|smart-tv|lg|samsung/i.test(navigator.userAgent);

    // Multivariant HLS: ONE master URL carries every audio/subtitle rendition (EXT-X-MEDIA). Audio is
    // switched NATIVELY via hls.audioTrack (see switchAudio in WebMediaPlayer) — no per-track URLs, no
    // source reload. Only non-HLS providers still swap the source URL per track.
    const audioUrl = playback.streamUrl;

    // streamType is authoritative (the plugin decides). A URL sniff is only a backward-compat fallback
    // for legacy sources that hand an .m3u8 URL WITHOUT a streamType — otherwise Chrome (no native HLS)
    // would wrongly play it as a progressive <video src>.
    const isHls = playback.streamType === "m3u8" || playback.streamType === "hls"
      || (!playback.streamType && (audioUrl.includes(".m3u8") || audioUrl.includes("/hls/")));

    // Guard a genuinely-unplayable direct file (a non-HLS plugin handing a non-native container we can't
    // remux). TorrentGo streams are always HLS, so this never fires for them.
    if (!isHls && !isSmartTV) {
      const ext = getFileExtension(audioUrl);
      const NATIVE = ["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "mpd", "m4v", "m4a"];
      if (ext && !NATIVE.includes(ext)) {
        setPlayerError(
          `Формат файла (.${ext}) не поддерживается вашим браузером. Пожалуйста, откройте видео во внешнем плеере (VLC, Infuse) или воспользуйтесь Smart TV.`
        );
        setIsMetadataLoading(false);
        return;
      }
    }

    // Resume position from the saved timecode. VOD HLS + native files share an absolute whole-file
    // timeline → currentTime is absolute, no seek offset ever.
    let startPos = 0;
    {
      const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
      const savedResume = localStorage.getItem(resumeKey);
      if (savedResume) {
        const parsed = Number(savedResume);
        if (!isNaN(parsed) && parsed > 0) startPos = parsed;
      }
    }
    setSeekOffset(0);

    const gatewayBase = ApiClient.baseURL;
    const proxiedUrl = getProxyUrl(audioUrl, gatewayBase, playback.headers);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        // VOD delivery — buffer far ahead so network dips don't stall playback. lowLatencyMode must
        // stay OFF (it shrinks the buffer).
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        backBufferLength: 30,
        maxBufferHole: 0.5,
        // A cold segment after a deep seek may need the server to reposition ffmpeg + fetch torrent
        // pieces before it can answer — give it generous time so it doesn't fail fatally.
        fragLoadingTimeOut: 60000,
        // Be more persistent recovering from a transient buffer stall before giving up (gap-jump).
        nudgeMaxRetry: 8,
        startPosition: startPos > 0 ? startPos : -1,
      });
      hlsRef.current = hls;

      // [HLS-DIAG] Temporary instrumentation for the post-seek / post-audio-switch segment-loading
      // regression. Logs via logger.warn so entries also land in the in-app history buffer
      // (retrievable on-device where the browser console isn't reachable). Remove after diagnosis.
      logger.warn("[HLS-DIAG] init", { version: Hls.version });
      const rngs = (tr?: TimeRanges) => tr
        ? Array.from({ length: tr.length }, (_, i) => [Number(tr.start(i).toFixed(1)), Number(tr.end(i).toFixed(1))])
        : null;
      hls.on(Hls.Events.FRAG_LOADING, (_e, data) => {
        logger.warn("[HLS-DIAG] FRAG_LOADING", { type: data.frag.type, sn: data.frag.sn, start: Number(data.frag.start.toFixed(1)), dur: Number(data.frag.duration.toFixed(2)) });
      });
      hls.on(Hls.Events.FRAG_BUFFERED, (_e, data: any) => {
        // Where hls.js believes this fragment LANDED (post-append mapping) — the key drift signal.
        logger.warn("[HLS-DIAG] FRAG_BUFFERED", {
          type: data.frag.type, sn: data.frag.sn,
          start: Number(data.frag.start.toFixed(2)),
          startPTS: data.frag.startPTS != null ? Number(data.frag.startPTS.toFixed(2)) : null,
          endPTS: data.frag.endPTS != null ? Number(data.frag.endPTS.toFixed(2)) : null,
        });
      });
      hls.on(Hls.Events.BUFFER_APPENDED, (_e, data: any) => {
        // Per-SourceBuffer ranges (audio vs video), not just the element intersection.
        logger.warn("[HLS-DIAG] BUFFER_APPENDED", {
          type: data.type,
          audio: rngs(data.timeRanges?.audio),
          video: rngs(data.timeRanges?.video),
          curr: Number(video.currentTime.toFixed(2)),
        });
      });
      // Audio renditions come from the manifest's EXT-X-MEDIA (name/language set by the backend master).
      // They populate the player's audio menu; switching assigns hls.audioTrack — hls.js swaps only the
      // audio SourceBuffer in place (video untouched → no reload, no black frame).
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, data: any) => {
        if (playerSessionRef.current !== sessionId) return;
        const tracks = (data.audioTracks || []).map((t: any, i: number) => ({
          id: i,
          name: t.name || t.lang || `Audio ${i + 1}`,
        }));
        setAudioTracks(tracks);
        setCurrentAudioTrack(hls.audioTrack);
        logger.warn("[HLS-DIAG] AUDIO_TRACKS_UPDATED", { count: tracks.length, active: hls.audioTrack });
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, (_e, data: any) => {
        logger.warn("[HLS-DIAG] AUDIO_TRACK_SWITCHING", { id: data.id });
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data: any) => {
        if (playerSessionRef.current !== sessionId) return;
        setCurrentAudioTrack(data.id);
        logger.warn("[HLS-DIAG] AUDIO_TRACK_SWITCHED", { id: data.id });
      });

      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playerSessionRef.current !== sessionId) return;

        // Set quality levels
        const levels = hls.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
        }));
        setRawLevels(levels);
        setCurrentQualityLevel(hls.currentLevel);
        setHlsActiveLevel(hls.currentLevel);

        // NOTE: audio tracks come from the plugin (playback.audios), NOT hls.audioTracks — each TorrentGo
        // HLS master is single-audio (one producer per ?audio=N), so hls.audioTracks is empty. Switching
        // audio reloads the source with a different plugin URL (see the audioUrl resolution above).

        setIsMetadataLoading(false);
        syncNativeTextTracksRef.current(video);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
        setCurrentQualityLevel(data.level);
        setHlsActiveLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (playerSessionRef.current !== sessionId) return;
        // [HLS-DIAG] log every error (fatal or not) with frag + audio-track context. Remove after diagnosis.
        logger.warn("[HLS-DIAG] ERROR", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          code: (data as any).response?.code,
          sn: (data as any).frag?.sn,
          url: (data as any).frag?.url,
          audioTracks: hls.audioTracks?.length,
          audioTrack: hls.audioTrack,
        });
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              logger.warn("[useHlsPlayer] Hls network error, retrying...", data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              logger.warn("[useHlsPlayer] Hls media error, recovering...", data);
              hls.recoverMediaError();
              break;
            default:
              logger.error("[useHlsPlayer] Fatal Hls error:", data);
              setPlayerError("Ошибка при воспроизведении HLS потока.");
              setIsMetadataLoading(false);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
        cleanupActiveResources();
      };
    } else {
      // Native progressive / native HLS (e.g. Safari)
      video.setAttribute("crossorigin", "anonymous");
      video.src = proxiedUrl;
      setSrcResetCounter((p) => p + 1);

      const handleLoadedMetadata = () => {
        if (playerSessionRef.current !== sessionId) return;
        if (startPos > 0) {
          video.currentTime = startPos;
        }
        setIsMetadataLoading(false);
        syncNativeTextTracksRef.current(video);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      video.play().catch(() => {
        video.muted = true;
        video.play().catch((err) => logger.error("[useHlsPlayer] Autoplay failed:", err));
      });

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        cleanupActiveResources();
      };
    }
  }, [playback.streamUrl, playback.streamType, cleanupActiveResources, setPlayerError, setIsMetadataLoading, setSeekOffset, setAudioTracks, setCurrentAudioTrack]);

  return {
    hlsRef,
    srcResetCounter,
    setSrcResetCounter,
    rawLevels,
    setRawLevels,
    hlsActiveLevel,
    setHlsActiveLevel,
    currentQualityLevel,
    setCurrentQualityLevel,
    autoRefreshCountRef,
    cleanupActiveResources,
  };
}
