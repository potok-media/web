import { useCallback, useEffect, useRef } from "react";

export interface InjectedSubtitle {
  id: string;
  label: string;
  srclang: string;
  src: string;
  codec?: string;
}

export function mergeAndDeduplicateSubtitles(
  existing: InjectedSubtitle[],
  incoming: InjectedSubtitle[],
): InjectedSubtitle[] {
  const seenSrc = new Set<string>();
  const seenLabelLang = new Set<string>();
  const merged: InjectedSubtitle[] = [];

  const add = (sub: InjectedSubtitle) => {
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

export function useSubtitleWindowFetch(streamHash: string, fileIndex: string) {
  const subtitleFetchPromises = useRef<Record<string, Promise<string> | undefined>>({});
  const subtitleWindowPromises = useRef<Record<string, Promise<string>>>({});

  const fetchSubtitleWindow = useCallback((track: { id: string; src: string; codec?: string }, bucket: number) => {
    if (!track?.src || track.src.startsWith("blob:")) return null;
    const key = `${track.id}:${bucket}`;
    const existing = subtitleWindowPromises.current[key];
    if (existing) return existing;

    const isAss = track.codec === "ass" || track.codec === "ssa";
    const format = isAss ? "ass" : "webvtt";
    const url = `${track.src}${track.src.includes("?") ? "&" : "?"}format=${format}&start=${bucket}`;
    const p = fetch(url)
      .then((res) => {
        if (res.status === 202) throw new Error("subtitle window not ready");
        if (!res.ok) throw new Error("Failed to fetch subtitle window");
        return res.text();
      })
      .catch((err) => {
        delete subtitleWindowPromises.current[key];
        throw err;
      });
    subtitleWindowPromises.current[key] = p;
    return p;
  }, []);

  useEffect(() => {
    subtitleFetchPromises.current = {};
    subtitleWindowPromises.current = {};
  }, [streamHash, fileIndex]);

  return { subtitleFetchPromises, fetchSubtitleWindow };
}