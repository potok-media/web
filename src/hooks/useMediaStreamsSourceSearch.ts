import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { TORRENT_SEARCH_HTTP_TIMEOUT_MS } from "../utils/extensions/pluginHttpTimeout";
import type { RawStreamPayload } from "@potok/sdk-types";


interface UseMediaStreamsSourceSearchParams {
  mediaType?: string;
  mediaId: number;
  mediaTitle?: string;
  mediaOriginalTitle?: string;
  mediaEnglishTitle?: string;
  mediaImdbId?: string;
  workId?: string;
  orderingId?: string;
  groupId?: string;
  episodeId?: string;
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
  mediaOriginalTitle,
  mediaEnglishTitle,
  mediaImdbId,
  workId,
  orderingId,
  groupId,
  episodeId,
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
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);

  const resultsCache = useRef<Map<string, RawStreamPayload[]>>(new Map());
  const activeRequestIdRef = useRef<string>("");
  const shouldForceNextSearchRef = useRef(false);
  const searchKey = JSON.stringify([
    activeTab, mediaType, mediaId, workId, orderingId, groupId, episodeId, season, episode,
    mediaTitle, mediaOriginalTitle, mediaEnglishTitle, mediaImdbId,
  ]);

  useEffect(() => {
    if (activeTab) {
      const cached = resultsCache.current.get(searchKey);
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
  }, [activeTab, searchKey, sources.length, loadingMediaDetails]);

  useEffect(() => {
    activeRequestIdRef.current = "";
    if (!mediaTitle || !activeTab || !activeSource) return;
    const cached = resultsCache.current.get(searchKey);
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
    setSearchStartedAt(Date.now());
    setError(null);

    ExtensionRegistry.sendSandboxRequest<RawStreamPayload[]>(
      activeSource.pluginId,
      "STREAM_SOURCE_SEARCH",
      {
        query: {
          title: mediaTitle,
          originalTitle: mediaOriginalTitle,
          englishTitle: mediaEnglishTitle,
          imdbId: mediaImdbId,
          tmdbId: mediaId,
          workId,
          orderingId,
          groupId,
          episodeId,
          type: mediaType as "movie" | "tv",
          season,
          episode,
          forceSearch: isForce,
        },
      },
      TORRENT_SEARCH_HTTP_TIMEOUT_MS,
      (partial) => {
        if (activeRequestIdRef.current !== reqId) return;
        if (!Array.isArray(partial)) return;
        setStreams(partial);
      },
    )
      .then((results) => {
        if (activeRequestIdRef.current !== reqId) return;
        resultsCache.current.set(searchKey, results || []);
        setStreams(results || []);
      })
      .catch((err) => {
        if (activeRequestIdRef.current !== reqId) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (activeRequestIdRef.current !== reqId) return;
        setLoading(false);
        setSearchStartedAt(null);
      });
    return () => {
      if (activeRequestIdRef.current === reqId) activeRequestIdRef.current = "";
    };
  }, [
    searchKey,
    mediaTitle,
    mediaOriginalTitle,
    mediaEnglishTitle,
    mediaImdbId,
    workId,
    orderingId,
    groupId,
    episodeId,
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
    if (loading) {
      activeRequestIdRef.current = "";
      setLoading(false);
      setSearchStartedAt(null);
      return;
    }
    resultsCache.current.delete(searchKey);
    shouldForceNextSearchRef.current = true;
    // Clear stale rows immediately so the skeleton shows until the first batch arrives.
    setStreams([]);
    setLoading(true);
    setSearchStartedAt(Date.now());
    setRefreshTrigger((prev) => prev + 1);
  }, [activeTab, searchKey, loading]);

  return {
    sources,
    activeTab,
    setActiveTab,
    activeSource,
    streams,
    loading,
    error,
    searchStartedAt,
    searchTimeoutMs: TORRENT_SEARCH_HTTP_TIMEOUT_MS,
    handleRefresh,
  };
}
