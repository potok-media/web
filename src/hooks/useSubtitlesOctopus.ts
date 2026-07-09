import { useEffect, useRef, type RefObject } from "react";
import { logger } from "../utils/logger";
// @ts-expect-error libass-wasm has no bundled types
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

export interface SubtitlesOctopusInstance {
  dispose: () => void;
  freeTrack: () => void;
  setTrack: (text: string) => void;
  setCurrentTime: (time: number) => void;
  timeOffset: number;
  canvas?: HTMLCanvasElement;
}

interface InjectedSubtitleTrack {
  id: string;
  src: string;
  codec?: string;
}

interface UseSubtitlesOctopusParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  seekOffsetRef: RefObject<number>;
  seekOffset: number;
  srcResetCounter: number;
  currentSubtitleTrack: number;
  injectedSubtitles: InjectedSubtitleTrack[];
  subtitleFetchPromises: RefObject<Record<string, Promise<string> | undefined>>;
}

export function useSubtitlesOctopus({
  videoRef,
  seekOffsetRef,
  seekOffset,
  srcResetCounter,
  currentSubtitleTrack,
  injectedSubtitles,
  subtitleFetchPromises,
}: UseSubtitlesOctopusParams) {
  const octopusRef = useRef<SubtitlesOctopusInstance | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const selectedTrack =
      currentSubtitleTrack !== -1 ? injectedSubtitles[currentSubtitleTrack] : null;
    const isAss = selectedTrack
      ? selectedTrack.codec === "ass" || selectedTrack.codec === "ssa"
      : false;

    logger.log(
      "[OCTOPUS] Effect fired. currentSubtitleTrack:",
      currentSubtitleTrack,
      "isAss:",
      isAss,
      "octopusRef:",
      !!octopusRef.current,
    );

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode =
        i === currentSubtitleTrack ? (isAss ? "hidden" : "showing") : "disabled";
    }

    if (!isAss) {
      if (octopusRef.current) {
        logger.log("[OCTOPUS] Disposing instance (no ASS track active)");
        try {
          octopusRef.current.dispose();
        } catch (error) {
          logger.error("[OCTOPUS] Error disposing:", error);
        }
        octopusRef.current = null;
      }
      return;
    }

    if (!octopusRef.current) {
      logger.log("[OCTOPUS] Initializing SubtitlesOctopus with minimal template");
      try {
        octopusRef.current = new SubtitlesOctopus({
          video,
          subContent: MINIMAL_ASS_TEMPLATE,
          workerUrl: "/assets/subtitles-octopus/subtitles-octopus-worker.js",
          legacyWorkerUrl: "/assets/subtitles-octopus/subtitles-octopus-worker-legacy.js",
          fallbackFont: "/fonts/subtitle-fallback.woff2",
          timeOffset: seekOffsetRef.current,
          debug: true,
        }) as SubtitlesOctopusInstance;
      } catch (error: unknown) {
        logger.error("[OCTOPUS] Failed to initialize SubtitlesOctopus:", error);
      }
    }

    let active = true;
    const isUpload = selectedTrack?.src.startsWith("blob:") ?? false;
    if (isUpload && selectedTrack) {
      const currentPromise = subtitleFetchPromises.current[selectedTrack.id];
      currentPromise
        ?.then((text: string) => {
          if (!active) return;
          const oct = octopusRef.current;
          if (!oct) return;
          try {
            oct.freeTrack();
          } catch {
            /* noop */
          }
          oct.setTrack(text);
          try {
            oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
          } catch (error) {
            logger.error("[OCTOPUS] setCurrentTime after setTrack failed:", error);
          }
        })
        .catch((error: unknown) => {
          logger.error("[OCTOPUS] Error resolving subtitle promise:", error);
        });
    }

    return () => {
      active = false;
    };
  }, [
    currentSubtitleTrack,
    injectedSubtitles,
    seekOffsetRef,
    subtitleFetchPromises,
    videoRef,
  ]);

  useEffect(() => {
    return () => {
      if (octopusRef.current) {
        logger.log("[OCTOPUS] Cleanup on unmount/source change");
        try {
          octopusRef.current.dispose();
        } catch (error) {
          logger.error("[OCTOPUS] Error disposing:", error);
        }
        octopusRef.current = null;
      }
    };
  }, [srcResetCounter]);

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
  }, [seekOffset, videoRef]);

  return octopusRef;
}