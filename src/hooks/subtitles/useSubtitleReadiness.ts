import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { convertSrtToVtt } from "../../utils/SubtitleHelper";
import type { InjectedSubtitleTrack, SubtitleReadiness } from "./subtitleTypes";

export function useSubtitleReadiness(
  injectedSubtitles: InjectedSubtitleTrack[],
  currentSubtitleTrack: number,
  srcResetCounter: number,
  subtitleFetchPromises: RefObject<Record<string, Promise<string> | undefined>>,
) {
  const subtitleBlobUrls = useRef<Record<string, string>>({});
  const [, setSubtitleBlobVersion] = useState(0);
  const [subtitleState, setSubtitleState] = useState<Record<string, SubtitleReadiness>>({});
  const subtitleGen = useRef(0);

  useEffect(() => {
    subtitleGen.current++;
    setSubtitleState({});
  }, [srcResetCounter]);

  const markSubtitle = useCallback((id: string, val: SubtitleReadiness, gen: number) => {
    setSubtitleState((prev) => {
      if (gen !== subtitleGen.current) return prev;
      if (prev[id] === val) return prev;
      return { ...prev, [id]: val };
    });
  }, []);

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
          .then(() => {
            if (active) markSubtitle(track.id, "ready", gen);
          })
          .catch(() => {
            if (active) markSubtitle(track.id, "error", gen);
          });
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
        .catch(() => {
          if (active) markSubtitle(track.id, "error", gen);
        });
    });
    return () => {
      active = false;
    };
  }, [injectedSubtitles, markSubtitle, currentSubtitleTrack, subtitleFetchPromises]);

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

  return { subtitleBlobUrls, subtitleState, subtitleGen, markSubtitle };
}