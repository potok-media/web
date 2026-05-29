import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard, TorrentSearchResult } from "../network/ApiTypes";
import { webSocketClient } from "../network/WebSocketClient";
import { parseRelativeDate } from "../utils/formatters";

interface UseTorrentsPageProps {
  mediaType?: string;
  mediaId?: number;
  season?: number;
  episode?: number;
  initialMedia?: MediaCard;
  onError: (msg: string) => void;
}

export function useTorrentsPage({
  mediaType,
  mediaId,
  season,
  episode,
  initialMedia,
  onError,
}: UseTorrentsPageProps) {
  const [media, setMedia] = useState<MediaCard | null>(initialMedia || null);
  const [torrents, setTorrents] = useState<TorrentSearchResult[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(() => !initialMedia);
  const [loadingTorrents, setLoadingTorrents] = useState(false);

  // Filters & Sort states
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("seedersDesc");

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchMediaAndTorrents = useCallback(async (force = false) => {
    if (!mediaType || !mediaId) return;
    try {
      if (!initialMedia) setLoadingMedia(true);
      const mediaData = await ApiClient.fetchMediaDetails(mediaType, mediaId);
      setMedia(mediaData);
      setLoadingMedia(false);

      setLoadingTorrents(true);
      const torrentRes = await ApiClient.searchTorrents({
        query: mediaData.title,
        mediaType: mediaData.mediaType,
        id: mediaData.id,
        englishTitle: mediaData.englishTitle,
        originalTitle: mediaData.originalTitle,
        season,
        episode,
        forceSearch: force,
      });
      setTorrents(torrentRes.results || []);
    } catch (err: unknown) {
      onErrorRef.current(err instanceof Error ? err.message : "Ошибка загрузки данных");
    } finally {
      setLoadingMedia(false);
      setLoadingTorrents(false);
    }
  }, [mediaType, mediaId, season, episode]);

  // Initial fetch
  useEffect(() => {
    fetchMediaAndTorrents();
  }, [fetchMediaAndTorrents]);

  // Live WebSocket updates in-place
  useEffect(() => {
    const unsubOverride = webSocketClient.subscribe("override-updated", (data) => {
      try {
        const payload = JSON.parse(data);
        const targetHash = payload.hash.toLowerCase();
        
        setTorrents((prevTorrents) =>
          prevTorrents.map((t) => {
            const h = ApiClient.getHashFromMagnet(t.magnetUri || "") || ApiClient.getHashFromMagnet(t.link || "");
            if (h && h.toLowerCase() === targetHash) {
              return {
                ...t,
                override: {
                  hash: payload.hash,
                  season: payload.season,
                  episodeOffset: payload.episodeOffset,
                },
              };
            }
            return t;
          })
        );
      } catch {
        // Safe fallback
      }
    });

    return () => unsubOverride();
  }, []);

  // Compute trackers list
  const trackers = useMemo(() => {
    return Array.from(new Set(torrents.map((t) => t.tracker).filter((t): t is string => !!t)));
  }, [torrents]);

  // Filters & Sorting torrents
  const filteredAndSortedTorrents = useMemo(() => {
    const filtered = torrents.filter((t) => {
      const matchesQuality = qualityFilter === "all" || t.title.toLowerCase().includes(qualityFilter.toLowerCase());
      const matchesTracker = activeTracker === "all" || t.tracker === activeTracker;
      return matchesQuality && matchesTracker;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "seedersDesc") {
        return (b.seeders ?? 0) - (a.seeders ?? 0);
      }
      if (sortOption === "publishDateDesc") {
        return parseRelativeDate(b.publishDate) - parseRelativeDate(a.publishDate);
      }
      if (sortOption === "sizeDesc") {
        return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
      }
      if (sortOption === "sizeAsc") {
        return (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
      }
      return 0;
    });
  }, [torrents, qualityFilter, activeTracker, sortOption]);

  return {
    media,
    torrents: filteredAndSortedTorrents,
    loadingMedia,
    loadingTorrents,
    trackers,
    qualityFilter,
    setQualityFilter,
    activeTracker,
    setActiveTracker,
    sortOption,
    setSortOption,
    refetch: () => fetchMediaAndTorrents(true),
  };
}
