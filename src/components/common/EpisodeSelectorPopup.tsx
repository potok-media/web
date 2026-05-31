import React, { useState, useEffect } from "react";
import TorrentOverridePicker from "../TorrentOverridePicker";
import TorrentFilesHeader from "../TorrentFilesHeader";
import TorrentFileRow from "../TorrentFileRow";

export interface GenericEpisodeItem {
  id: string;
  season: number;
  episode: number;
  title?: string;
  stillPath?: string;
  airDate?: string;
  isWatched?: boolean;
  audios: Array<{ id: string; name: string; url?: string }>;
  url?: string;
}

const getStreamType = (ep: GenericEpisodeItem): string => {
  const url = ep.url || (ep.audios && ep.audios[0]?.url) || "";
  if (url.includes(".mpd")) {
    return "DASH";
  }
  if (url.includes(".m3u8")) {
    return "HLS";
  }
  return "HLS";
};

interface EpisodeSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  
  // Dynamic override parameters
  onStartEditing?: () => void;
  onApplyOverride?: (seasonNum: number, epNum: number) => void;
  seasons?: any[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
}

export const EpisodeSelectorPopup: React.FC<EpisodeSelectorPopupProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  episodes = [],
  onPlay,
  onStartEditing,
  onApplyOverride,
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  tmdbSeasonsCount,
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  // Group episodes by season
  const uniqueSeasons = Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b);

  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [episodes, uniqueSeasons, selectedSeason]);

  // Reset editing state when popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSeasonEpisodes = React.useMemo(() => {
    return episodes.filter((e) => e.season === selectedSeason);
  }, [episodes, selectedSeason]);

  const handleSelectEpisode = (ep: GenericEpisodeItem) => {
    onPlay(ep, "default");
    onClose();
  };

  // Memoize mapped file and meta objects so that object references are stable in memory
  const mappedSeasonEpisodes = React.useMemo(() => {
    return currentSeasonEpisodes.map((ep) => {
      const mappedFile = {
        id: ep.id,
        path: ep.title || `Серия ${ep.episode}`,
        name: ep.title || `Серия ${ep.episode}`,
        size: 0,
        sizeLabel: ep.audios && ep.audios.length > 0 
          ? `${ep.audios.length} ${ep.audios.length === 1 ? "озвучка" : ep.audios.length < 5 ? "озвучки" : "озвучек"}`
          : "Основной поток",
        episode: ep.episode,
        season: ep.season,
        isSerial: true,
        title: ep.title,
        extension: getStreamType(ep)
      } as any;

      const mappedMeta = {
        id: ep.id,
        episodeNumber: ep.episode,
        name: ep.title || `Серия ${ep.episode}`,
        stillPath: ep.stillPath,
        airDate: ep.airDate,
        seasonNumber: ep.season
      } as any;

      return {
        ep,
        mappedFile,
        mappedMeta
      };
    });
  }, [currentSeasonEpisodes]);

  // Stable callback handler for onPlay to prevent re-renders on child TorrentFileRow components
  const handlePlayFile = React.useCallback((file: any) => {
    const found = episodes.find((e) => e.id === file.id);
    if (found) {
      handleSelectEpisode(found);
    }
  }, [episodes]);

  const handleStartEditing = () => {
    setIsEditing(true);
    if (onStartEditing) {
      onStartEditing();
    }
  };

  const handleApplyOverrideInternal = (seasonNum: number, epNum: number) => {
    if (onApplyOverride) {
      onApplyOverride(seasonNum, epNum);
    }
    setIsEditing(false);
  };

  const dummyTorrent = {
    id: "online",
    title: subtitle || `${episodes.length} серий доступно для просмотра`,
    magnetUri: ""
  } as any;

  const dummyMedia = {
    mediaType: "tv",
    progress: {
      completed: episodes.filter(e => e.isWatched).length,
      aired: episodes.length,
      percentage: episodes.length > 0 ? (episodes.filter(e => e.isWatched).length / episodes.length) * 100 : 0
    }
  } as any;

  const tmdbCount = tmdbSeasonsCount || 1;
  const maxSeasonInBalancer = uniqueSeasons.length > 0 ? Math.max(...uniqueSeasons) : 1;
  
  // We show parsing failed banner if any episode has a season number greater than TMDB's season count
  const parsingFailed = maxSeasonInBalancer > tmdbCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: isEditing ? "1000px" : "850px", display: "flex", flexDirection: "column" }}
      >
        <TorrentFilesHeader
          isEditing={isEditing}
          onClose={onClose}
          onBackToFiles={() => setIsEditing(false)}
          torrent={dummyTorrent}
          mediaItem={dummyMedia}
          parsingFailed={parsingFailed}
          loading={false}
          filesLength={episodes.length}
          onStartEditing={onStartEditing ? handleStartEditing : () => {}}
          customTitle={title}
        />

        {/* Content Body (replicated exactly from TorrentFilesPopup) */}
        <div className="torrent-popup-body" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {isEditing ? (
            <TorrentOverridePicker
              seasons={seasons}
              seasonsLoading={seasonsLoading}
              onApplyOverride={handleApplyOverrideInternal}
            />
          ) : (
            <div className="files-list-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Horizontal Season Tabs */}
              {uniqueSeasons.length > 1 && (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  {uniqueSeasons.map((sNum) => (
                    <button
                      key={sNum}
                      className={`potok-badge ${selectedSeason === sNum ? "potok-badge-info" : "potok-badge-secondary"}`}
                      style={{ cursor: "pointer", border: "none", padding: "8px 18px", borderRadius: "20px", fontSize: "0.85rem" }}
                      onClick={() => setSelectedSeason(sNum)}
                    >
                      Сезон {sNum}
                    </button>
                  ))}
                </div>
              )}

              {/* Rows List (replicated 1-in-1 from TorrentFileRow design) */}
              <div className="torrent-popup-rows-list" style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
                {mappedSeasonEpisodes.length > 0 ? (
                  mappedSeasonEpisodes.map(({ ep, mappedFile, mappedMeta }) => (
                    <TorrentFileRow
                      key={ep.id}
                      file={mappedFile}
                      metadata={mappedMeta}
                      mediaItem={dummyMedia}
                      isWatched={!!ep.isWatched}
                      onPlay={handlePlayFile}
                    />
                  ))
                ) : (
                  <div className="torrent-popup-empty-files">
                    Нет доступных серий.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Saving Blur Overlay */}
          {isSaving && (
            <div className="saving-overlay">
              <div className="saving-content">
                <div className="spinner" />
                <span>Сохранение смещения...</span>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default EpisodeSelectorPopup;
