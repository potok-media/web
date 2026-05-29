import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import type { TorrentSearchResult, TorrentFileItem, MediaCard, TvSeason, TvEpisode } from "../network/ApiTypes";
import { TorrentParser } from "../utils/TorrentParser";
import { fetchTvEpisodeMetadata } from "../utils/EpisodeMetadataFetcher";
import { webSocketClient } from "../network/WebSocketClient";

interface UseTorrentFilesProps {
  torrent: TorrentSearchResult;
  mediaItem: MediaCard;
  isOpen: boolean;
  onClose: () => void;
  showHUD: (type: "success" | "error" | "info" | "warning", msg: string) => void;
}

export function useTorrentFiles({
  torrent,
  mediaItem,
  isOpen,
  onClose,
  showHUD,
}: UseTorrentFilesProps) {
  const [files, setFiles] = useState<TorrentFileItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit/Offset states
  const [isEditing, setIsEditing] = useState(false);
  const [seasons, setSeasons] = useState<TvSeason[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [seasonsCount, setSeasonsCount] = useState<number | undefined>(mediaItem.numberOfSeasons);

  // Episode metadata map (key: "season:episode" -> TvEpisode)
  const [episodeMetadata, setEpisodeMetadata] = useState<Record<string, TvEpisode>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const showHUDRef = useRef(showHUD);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    showHUDRef.current = showHUD;
    onCloseRef.current = onClose;
  }, [showHUD, onClose]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setEpisodeMetadata({});
      
      const res = await ApiClient.getTorrentFiles({
        title: torrent.title,
        link: torrent.link,
        magnetUri: torrent.magnetUri,
        mediaType: mediaItem.mediaType,
        originalTitle: mediaItem.originalTitle,
        poster: mediaItem.posterSrc,
        tmdbId: mediaItem.id,
      });

      const rawFiles = res.items || [];
      const hash = ApiClient.getHashFromMagnet(torrent.magnetUri || "") || 
                   ApiClient.getHashFromMagnet(torrent.link || "") || 
                   torrent.id || 
                   "";
      
      // Get override offset from backend
      const override = await ApiClient.getTorrentOverride(hash);

      // Refine files by parsing seasons/episodes client-side matching macOS
      const refinedFiles = rawFiles.map((file) => {
        let filePath = file.path || file.title || "";
        if (!filePath.includes("/")) {
          filePath = torrent.title ? `${torrent.title}/${filePath}` : filePath;
        }
        const parsed = TorrentParser.parseEpisode(
          filePath,
          mediaItem.mediaType,
          mediaItem.numberOfSeasons,
          override?.season,
          override?.episodeOffset
        );

        return {
          ...file,
          season: parsed.season,
          episode: parsed.episode,
          isSerial: parsed.isSerial,
        } as TorrentFileItem;
      });

      // Clean prefix titles
      const cleanedFiles = TorrentParser.cleanTitles(refinedFiles);
      setFiles(cleanedFiles);

      // Fetch TMDB episode details for graphical rows in parallel
      if (mediaItem.mediaType === "tv" && cleanedFiles.length > 0) {
        try {
          setLoadingMetadata(true);
          const metadataMap = await fetchTvEpisodeMetadata(mediaItem, cleanedFiles);
          setEpisodeMetadata(metadataMap);
        } catch (e) {
          console.error("Failed to load TMDB episode metadata", e);
        } finally {
          setLoadingMetadata(false);
        }
      }
    } catch {
      showHUDRef.current("error", "Не удалось прочитать файлы торрента");
      onCloseRef.current();
    } finally {
      setLoading(false);
    }
  }, [torrent, mediaItem]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setIsEditing(false);
    }
  }, [isOpen, torrent, fetchFiles]);

  // Live WebSocket sync for updates
  useEffect(() => {
    if (!isOpen) return;

    const unsubOverride = webSocketClient.subscribe("override-updated", (data) => {
      try {
        const payload = JSON.parse(data);
        const currentHash = ApiClient.getHashFromMagnet(torrent.magnetUri || "") || 
                            ApiClient.getHashFromMagnet(torrent.link || "") || 
                            torrent.id || 
                            "";
        const cleanCurrent = ApiClient.cleanHash(currentHash);
        const cleanPayload = ApiClient.cleanHash(payload.hash || "");
        if (cleanPayload === cleanCurrent) {
          showHUDRef.current("info", "Смещение обновлено. Перечитываем файлы...");
          fetchFiles();
        }
      } catch {
        // Safe fallback
      }
    });

    return () => unsubOverride();
  }, [isOpen, torrent, fetchFiles]);

  const handleStartEditing = async () => {
    setIsEditing(true);
    if (seasons.length > 0) return;

    try {
      setSeasonsLoading(true);
      let count = seasonsCount;
      if (!count) {
        const details = await ApiClient.fetchMediaDetails(mediaItem.mediaType, mediaItem.id);
        count = details.numberOfSeasons;
        setSeasonsCount(count);
      }

      const totalSeasons = count || 1;
      const promises: Promise<TvSeason>[] = [];
      for (let i = 1; i <= totalSeasons; i++) {
        promises.push(ApiClient.fetchTvSeason(mediaItem.id, i));
      }

      const results = await Promise.all(promises);
      setSeasons(results);
    } catch {
      showHUDRef.current("error", "Не удалось загрузить эпизоды с TMDB");
    } finally {
      setSeasonsLoading(false);
    }
  };

  const handleApplyOverride = async (seasonNum: number, epNum: number) => {
    try {
      setIsSaving(true);
      const hash = ApiClient.getHashFromMagnet(torrent.magnetUri || "") || 
                   ApiClient.getHashFromMagnet(torrent.link || "") || 
                   torrent.id || 
                   "";
      const episodeOffset = epNum - 1;
      await ApiClient.saveTorrentOverride(hash, seasonNum, episodeOffset);
      showHUDRef.current("success", "Смещение успешно сохранено!");
      setIsEditing(false);
      fetchFiles();
    } catch {
      showHUDRef.current("error", "Не удалось сохранить смещение");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    files,
    loading,
    isEditing,
    setIsEditing,
    seasons,
    seasonsLoading,
    isSaving,
    episodeMetadata,
    loadingMetadata,
    handleStartEditing,
    handleApplyOverride,
    refetchFiles: fetchFiles,
  };
}
