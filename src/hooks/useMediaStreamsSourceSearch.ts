import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { RawStreamPayload } from "@potok/sdk-types";


interface UseMediaStreamsSourceSearchParams {
  mediaType?: string;
  mediaId: number;
  mediaTitle?: string;
  mediaImdbId?: string;
  season?: number;
  episode?: number;
  activeTabParam?: string;
  loadingMediaDetails: boolean;
  onError: (err: unknown) => void;
}

export function useMediaStreamsSourceSearch({
  mediaType,
  mediaId,
  mediaTitle,
  mediaImdbId,
  season,
  episode,
  activeTabParam,
  loadingMediaDetails,
  onError: _onError,
}: UseMediaStreamsSourceSearchParams) {
  const [sources, setSources] = useState(() =>
    ExtensionRegistry.getStreamSources().filter((s) =>
      s.supportedTypes.includes(mediaType as "movie" | "tv"),
    ),
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSources(
        ExtensionRegistry.getStreamSources().filter((s) =>
          s.supportedTypes.includes(mediaType as "movie" | "tv"),
        ),
      );
    };
    ExtensionRegistry.addListener(handleUpdate);
    return () => ExtensionRegistry.removeListener(handleUpdate);
  }, [mediaType]);

  const [activeTab, setActiveTab] = useState<string>(activeTabParam || "");
  useEffect(() => {
    if (activeTabParam) {
      setActiveTab(activeTabParam);
    } else if (sources.length > 0 && !activeTab) {
      setActiveTab(sources[0].id);
    }
  }, [sources, activeTabParam, activeTab]);

  const activeSource = useMemo(
    () => sources.find((s) => s.id === activeTab),
    [sources, activeTab],
  );

  const [streams, setStreams] = useState<RawStreamPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const resultsCache = useRef<Map<string, RawStreamPayload[]>>(new Map());
  const activeRequestIdRef = useRef<string>("");
  const shouldForceNextSearchRef = useRef(false);

  useEffect(() => {
    if (activeTab) {
      const cached = resultsCache.current.get(activeTab);
      if (cached) {
        setStreams(cached);
        setLoading(false);
      } else {
        setStreams([]);
        setLoading(true);
      }
    } else if (sources.length === 0 && !loadingMediaDetails) {
      setLoading(false);
    }
  }, [activeTab, sources.length, loadingMediaDetails]);

  useEffect(() => {
    if (!mediaTitle || !activeTab || !activeSource) return;
    const cached = resultsCache.current.get(activeTab);
    if (cached) {
      setStreams(cached);
      setLoading(false);
      return;
    }

    const isForce = shouldForceNextSearchRef.current;
    shouldForceNextSearchRef.current = false;

    const reqId = Math.random().toString(36).substring(7);
    activeRequestIdRef.current = reqId;
    setLoading(true);
    setError(null);

    ExtensionRegistry.sendSandboxRequest<RawStreamPayload[]>(
      activeSource.pluginId,
      "STREAM_SOURCE_SEARCH",
      {
        query: {
          title: mediaTitle,
          imdbId: mediaImdbId,
          tmdbId: mediaId,
          type: mediaType as "movie" | "tv",
          season,
          episode,
          forceSearch: isForce,
        },
      },
    )
      .then((results) => {
        if (activeRequestIdRef.current !== reqId) return;
        resultsCache.current.set(activeTab, results || []);
        setStreams(results || []);
      })
      .catch((err) => {
        if (activeRequestIdRef.current !== reqId) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (activeRequestIdRef.current === reqId) setLoading(false);
      });
  }, [
    mediaTitle,
    mediaImdbId,
    activeTab,
    activeSource,
    season,
    episode,
    refreshTrigger,
    mediaId,
    mediaType,
  ]);

  const handleRefresh = useCallback(() => {
    if (!activeTab) return;
    resultsCache.current.delete(activeTab);
    shouldForceNextSearchRef.current = true;
    setRefreshTrigger((prev) => prev + 1);
  }, [activeTab]);

  return {
    sources,
    activeTab,
    setActiveTab,
    activeSource,
    streams,
    loading,
    error,
    handleRefresh,
  };
}