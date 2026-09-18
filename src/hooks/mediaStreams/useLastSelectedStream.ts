import { useEffect, useState } from "react";
import type { ExtendedStreamPayload } from "../../components/common/streamListUtils";

export const CONTINUE_WATCHING_STORAGE_KEY = "continueWatching";

export type ContinueCursor = {
  mediaType: string;
  tmdbId: number;
  title: string;
  posterSrc?: string;
  backdropSrc?: string;
  stream: ExtendedStreamPayload;
  fileIndex: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  progressSeconds: number;
  durationSeconds: number;
  audioName?: string;
  updatedAt: number;
};

export function pluginScopedStorageKey(pluginId: string, key: string): string {
  return `potok_plugin:scoped:${pluginId}:${key}`;
}

export function continueTitleKey(mediaType: string, tmdbId: number | string): string {
  return `${mediaType}:${tmdbId}`;
}

export function parseContinueLedger(raw: string | null): Record<string, ContinueCursor> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, ContinueCursor>;
  } catch {
    return {};
  }
}

export function readContinueCursor(
  pluginId: string | undefined,
  mediaType?: string,
  mediaId?: number,
): ContinueCursor | null {
  if (!pluginId || !mediaType || !mediaId) return null;
  try {
    const raw = localStorage.getItem(pluginScopedStorageKey(pluginId, CONTINUE_WATCHING_STORAGE_KEY));
    const cursor = parseContinueLedger(raw)[continueTitleKey(mediaType, mediaId)];
    if (!cursor?.stream || typeof cursor.stream.title !== "string") return null;
    return cursor;
  } catch {
    return null;
  }
}

export function useLastSelectedStream(
  mediaType: string | undefined,
  mediaId: number,
  pluginId?: string,
) {
  const [lastSelected, setLastSelected] = useState<ExtendedStreamPayload | null>(() =>
    readContinueCursor(pluginId, mediaType, mediaId)?.stream ?? null,
  );

  useEffect(() => {
    setLastSelected(readContinueCursor(pluginId, mediaType, mediaId)?.stream ?? null);

    const onStorage = (e: Event) => {
      const detail = (e as CustomEvent<{ pluginId?: string; key?: string }>).detail;
      if (detail?.pluginId && pluginId && detail.pluginId !== pluginId) return;
      if (detail?.key && detail.key !== CONTINUE_WATCHING_STORAGE_KEY) return;
      setLastSelected(readContinueCursor(pluginId, mediaType, mediaId)?.stream ?? null);
    };
    window.addEventListener("potok_plugin_storage", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("potok_plugin_storage", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [pluginId, mediaType, mediaId]);

  return { lastSelected };
}
