import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { convertSrtToVtt, detectSubtitleKind, type SubtitleKind } from "../../utils/SubtitleHelper";
import type { InjectedSubtitleTrack } from "./subtitleTypes";

interface UseSubtitleTrackUploadParams {
  injectedSubtitles: InjectedSubtitleTrack[];
  setInjectedSubtitles: Dispatch<SetStateAction<InjectedSubtitleTrack[]>>;
  subtitleBlobUrls: RefObject<Record<string, string>>;
  subtitleFetchPromises: RefObject<Record<string, Promise<string> | undefined>>;
  subtitleGen: RefObject<number>;
  markSubtitle: (id: string, val: "ready" | "error", gen: number) => void;
  switchSubtitle: (id: number) => void;
}

export function useSubtitleTrackUpload({
  injectedSubtitles,
  setInjectedSubtitles,
  subtitleBlobUrls,
  subtitleFetchPromises,
  subtitleGen,
  markSubtitle,
  switchSubtitle,
}: UseSubtitleTrackUploadParams) {
  const { t } = useTranslation("player");

  const addSubtitleTrack = useCallback(
    (displayName: string, rawContent: string, kind: SubtitleKind) => {
      const isAss = kind === "ass";
      const content = isAss
        ? rawContent
        : kind === "srt"
          ? convertSrtToVtt(rawContent)
          : rawContent;
      const url = URL.createObjectURL(
        new Blob([content], { type: isAss ? "text/plain" : "text/vtt" }),
      );
      const id = `upload_${displayName}_${url}`;
      const newTrack: InjectedSubtitleTrack = {
        id,
        label: `${displayName || t("trackSelector.subtitlesFallback", { index: injectedSubtitles.length + 1 })} (${t("trackSelector.customLabel")})`,
        srclang: "custom",
        src: url,
        codec: isAss ? "ass" : "vtt",
      };
      subtitleBlobUrls.current[id] = url;
      if (isAss) subtitleFetchPromises.current[id] = Promise.resolve(rawContent);
      markSubtitle(id, "ready", subtitleGen.current);
      const newIndex = injectedSubtitles.length;
      setInjectedSubtitles((prev) => [...prev, newTrack]);
      switchSubtitle(newIndex);
    },
    [
      injectedSubtitles.length,
      markSubtitle,
      setInjectedSubtitles,
      subtitleBlobUrls,
      subtitleFetchPromises,
      subtitleGen,
      switchSubtitle,
      t,
    ],
  );

  const handleUploadSubtitle = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || "";
        const kind = detectSubtitleKind(file.name, content);
        addSubtitleTrack(file.name.replace(/\.(srt|vtt|ass|ssa)$/i, ""), content, kind);
      };
      reader.readAsText(file);
    },
    [addSubtitleTrack],
  );

  const handleAddSubtitleUrl = useCallback(
    async (rawUrl: string): Promise<void> => {
      const url = rawUrl.trim();
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const kind = detectSubtitleKind(url, content);
      let name = "";
      try {
        name = decodeURIComponent(
          new URL(url, window.location.href).pathname.split("/").pop() || "",
        ).replace(/\.(srt|vtt|ass|ssa)$/i, "");
      } catch {
        /* keep empty → fallback label */
      }
      addSubtitleTrack(name, content, kind);
    },
    [addSubtitleTrack],
  );

  return { handleUploadSubtitle, handleAddSubtitleUrl };
}