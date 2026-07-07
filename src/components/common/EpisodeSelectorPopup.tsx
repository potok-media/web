import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Check, CheckCircle2, ArrowLeft, Pencil, ListVideo, MoreHorizontal, RotateCcw } from "lucide-react";
import { FilmOff } from "./FilmOff";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { Focusable, FocusableButton } from "./TVNavigation";
import { Overlay } from "./Overlay";


export interface GenericEpisodeItem {
  id: string;
  season: number;
  episode: number;
  // RAW parsed season/episode BEFORE any override remap — the per-season editor computes offsets against these.
  rawSeason?: number;
  rawEpisode?: number;
  title?: string;
  // The ORIGINAL torrent file name (before TMDB overwrote `title` with the episode name) — shown subtly below.
  fileName?: string;
  stillPath?: string;
  airDate?: string;
  isWatched?: boolean;
  sizeLabel?: string;
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
  const match = url.match(/\.[a-zA-Z0-9]{2,5}$/);
  return match ? match[0].replace(".", "").toUpperCase() : "MP4";
};

// Generic Row component representing a single episode or stream file
interface EpisodeSelectorRowProps {
  episodeItem: GenericEpisodeItem;
  mediaType: string;
  backdropSrc?: string;
  posterSrc?: string;
  onPlay: () => void;
  focusKey?: string;
}

const EpisodeSelectorRow: React.FC<EpisodeSelectorRowProps> = React.memo(({
  episodeItem,
  mediaType,
  backdropSrc,
  posterSrc,
  onPlay,
  focusKey,
}) => {
  const { t } = useTranslation("media");
  const displayTitle = episodeItem.title || t("episode.fallbackName", { number: episodeItem.episode });

  let displaySubtitle = "";
  if (mediaType === "tv") {
    displaySubtitle = t("selector.season", { number: episodeItem.season });
    if (episodeItem.airDate) {
      try {
        const airDateStr = new Date(episodeItem.airDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
        displaySubtitle += ` • ${airDateStr}`;
      } catch (e) {
        // Safe fallback
      }
    }
  }

  const imageUrl = episodeItem.stillPath || backdropSrc || posterSrc;
  const getAudiosLabel = (audios: any[]) => {
    if (!audios || audios.length === 0) return "";
    if (audios.length === 1) return audios[0].name || "";
    return t("selector.audioCount", { count: audios.length });
  };

  const sizeLabel = episodeItem.sizeLabel || getAudiosLabel(episodeItem.audios);

  const streamType = getStreamType(episodeItem);

  return (
    <Focusable focusKey={focusKey} onEnterPress={onPlay}>
      {({ ref, focused }) => (
    <div
      ref={ref}
      className={`file-card-row ${focused ? "focused" : ""}`.trim()}
      onClick={onPlay}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="file-card-banner">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="file-card-image"
            loading="lazy"
          />
        ) : (
          <div className="file-card-preview-placeholder" />
        )}
        <div className="file-card-banner-overlay" />
        {episodeItem.episode && episodeItem.episode > 0 && (
          <span className="file-card-bg-number">{episodeItem.episode}</span>
        )}
        {episodeItem.isWatched && (
          <div className="file-card-badge-checked">
            <CheckCircle2 size="1.25rem" fill="var(--accent)" stroke="var(--bg-surface)" />
          </div>
        )}
      </div>

      <div className="file-card-info-panel">
        <h4 className="file-card-title">{displayTitle}</h4>
        {displaySubtitle && displaySubtitle !== displayTitle && (
          <span className="file-card-subtitle">{displaySubtitle}</span>
        )}
        {episodeItem.fileName && episodeItem.fileName !== displayTitle && (
          <span className="file-card-filename" title={episodeItem.fileName}>{episodeItem.fileName}</span>
        )}
      </div>

      <div className="file-card-details-panel">
        {episodeItem.isWatched && (
          <div className="file-card-watched-badge">
            <Check size="0.75rem" strokeWidth={3} />
            <span>{t("selector.watched")}</span>
          </div>
        )}
        {sizeLabel && <span className="file-card-size">{sizeLabel}</span>}
        {streamType && (
          <span className="file-card-ext-badge">
            {streamType.toLowerCase()}
          </span>
        )}
      </div>

      <FocusableButton className="file-card-play-btn" onClick={(e) => { e.stopPropagation(); onPlay(); }} onEnterPress={onPlay}>
        <Play size="1rem" fill="currentColor" className="file-card-play-icon-fix" />
      </FocusableButton>
    </div>
      )}
    </Focusable>
  );
});

// Generic Header component for the Selector popup
interface EpisodeSelectorHeaderProps {
  isEditing: boolean;
  onClose: () => void;
  onBackToFiles: () => void;
  title: string;
  subtitle?: string;
  mediaType: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  parsingFailed: boolean;
  onStartEditing?: () => void;
  onOpenAsPlaylist?: () => void;
}

const EpisodeSelectorHeader: React.FC<EpisodeSelectorHeaderProps> = React.memo(({
  isEditing,
  onClose,
  onBackToFiles,
  title,
  subtitle,
  mediaType,
  completedCount,
  totalCount,
  percentage,
  parsingFailed,
  onStartEditing,
  onOpenAsPlaylist,
}) => {
  const { t } = useTranslation("media");
  const handleBackOrClose = isEditing ? onBackToFiles : onClose;
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // TV: move focus into the menu when it opens so the remote can reach its items.
  useEffect(() => {
    if (!showPopover) return;
    const t = setTimeout(() => setFocus("ESEL_MENU_FIRST"), 50);
    return () => clearTimeout(t);
  }, [showPopover]);

  const hasOptions = !isEditing && mediaType === "tv" && totalCount > 0 && (onOpenAsPlaylist || onStartEditing);

  return (
    <div className="modal-header">
      <div className="modal-title-row">
        <FocusableButton className="modal-close-btn" onClick={handleBackOrClose}>
          <ArrowLeft size="1.25rem" />
        </FocusableButton>
        <div className="modal-title-text-group">
          <h3 className="modal-title modal-title-custom-size">{title}</h3>
          {subtitle && (
            <span className="modal-subtitle modal-subtitle-text">
              {subtitle}
            </span>
          )}
          
          {mediaType === "tv" && totalCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>
                {t("selector.progress", { completed: completedCount, total: totalCount, percentage: Math.round(percentage) })}
              </span>
            </div>
          )}

          {mediaType === "movie" && completedCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>{t("selector.watched")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="modal-header-actions-row">
        {parsingFailed && !isEditing && (
          <div className="parsing-hint-banner">
            {t("selector.parsingHintQuestion")} <br />
            {t("selector.parsingHintBody")}
          </div>
        )}

        {hasOptions && (
          <div className="popover-wrapper" ref={popoverRef} style={{ position: "relative" }}>
            <FocusableButton
              className="edit-btn popover-trigger-btn"
              onClick={() => setShowPopover(!showPopover)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "0.5rem",
                color: "#fff",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
            >
              <MoreHorizontal size="1rem" />
              <span>{t("selector.more")}</span>
            </FocusableButton>

            {showPopover && (
              <div 
                className="popover-dropdown-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 0.375rem)",
                  right: 0,
                  width: "13.75rem",
                  background: "rgba(20, 20, 25, 0.95)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "0.625rem",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
                  padding: "0.375rem",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}
              >
                {onOpenAsPlaylist && (
                  <FocusableButton
                    focusKey="ESEL_MENU_FIRST"
                    className="popover-menu-item"
                    onClick={() => { onOpenAsPlaylist(); setShowPopover(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      background: "none",
                      border: "none",
                      borderRadius: "0.375rem",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <ListVideo size="1rem" style={{ color: "var(--accent)" }} />
                    <span>{t("selector.openAsPlaylist")}</span>
                  </FocusableButton>
                )}

                {onStartEditing && (
                  <FocusableButton
                    focusKey={!onOpenAsPlaylist ? "ESEL_MENU_FIRST" : undefined}
                    className="popover-menu-item"
                    onClick={() => { onStartEditing(); setShowPopover(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      background: "none",
                      border: "none",
                      borderRadius: "0.375rem",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <Pencil size="1rem" style={{ color: "rgba(255, 255, 255, 0.6)" }} />
                    <span>{t("selector.editMapping")}</span>
                  </FocusableButton>
                )}
              </div>
            )}
          </div>
        )}

        <FocusableButton className="close-btn" onClick={handleBackOrClose}>
          {isEditing ? t("selector.back") : t("selector.close")}
        </FocusableButton>
      </div>
    </div>
  );
});

// Generic Grid Selector for choosing TMDB offsets
interface EpisodeOverridePickerProps {
  seasons: any[];
  seasonsLoading: boolean;
  onApplyOverride: (seasonNum: number, epNum: number) => void;
}

const EpisodeOverridePicker: React.FC<EpisodeOverridePickerProps> = React.memo(({
  seasons,
  seasonsLoading,
  onApplyOverride,
}) => {
  const { t } = useTranslation("media");
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + " г.";
    } catch {
      return dateStr;
    }
  };

  if (seasonsLoading) {
    return (
      <div className="picker-loading-container">
        <div className="premium-spinner" style={{ marginBottom: "1rem" }}>
          <div className="spinner-outer" />
          <div className="spinner-inner" />
        </div>
        <span className="picker-loading-label">{t("override.loading")}</span>
      </div>
    );
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">{t("override.prompt")}</h4>
      {seasons.map((season: any) => {
        const seasonNum = season.seasonNumber ?? season.season_number ?? 1;
        const episodes = season.episodes ?? [];
        if (episodes.length === 0) return null;

        return (
          <div key={season.id || seasonNum} className="season-section">
            <h3 className="season-section-title">{t("selector.season", { number: seasonNum })}</h3>
            <div className="episode-grid">
              {episodes.map((episode: any) => {
                const epNum = episode.episodeNumber ?? episode.episode_number ?? 1;
                const epName = episode.name || t("episode.fallbackName", { number: epNum });
                const epStill = episode.stillPath || episode.still_path;
                const epAirDate = episode.airDate || episode.air_date;

                return (
                  <FocusableButton
                    key={episode.id || epNum}
                    className="episode-picker-card"
                    onClick={() => onApplyOverride(seasonNum, epNum)}
                  >
                    <div className="episode-card-preview-wrap">
                      {epStill ? (
                        <img
                          src={epStill}
                          alt={epName}
                          className="episode-card-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="episode-still-fallback-placeholder">
                          <FilmOff size="1.75rem" />
                        </div>
                      )}
                      <span className="episode-card-badge">{epNum}</span>
                    </div>
                    <div className="episode-card-info">
                      <span className="episode-card-title">{epName}</span>
                      {epAirDate && (
                        <span className="episode-card-date">{formatDate(epAirDate)}</span>
                      )}
                    </div>
                  </FocusableButton>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// The Main Episode Selector Popup modal
interface EpisodeSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  
  onStartEditing?: () => void;
  onApplyOverride?: (sourceSeason: number | null, targetSeason: number, offset: number) => void;
  onResetOverride?: (sourceSeason: number | null) => void;
  seasonMap?: Record<string, { season: number; offset: number }>;
  seasons?: any[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  backdropSrc?: string;
  posterSrc?: string;
  mediaType?: string;
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
  onResetOverride,
  seasonMap = {},
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  tmdbSeasonsCount,
  backdropSrc,
  posterSrc,
  mediaType = "tv",
}) => {
  const { t } = useTranslation("media");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  // Which DISPLAYED section's pencil was clicked → the SOURCE season being remapped + its RAW first episode (the
  // baseline the offset is computed against, so a re-edit never compounds).
  const [editingSource, setEditingSource] = useState<{ sourceSeason: number | null; rawFirstEp: number } | null>(null);

  const uniqueSeasons = React.useMemo(() => {
    return Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b);
  }, [episodes]);

  // Group by SOURCE (raw) season, not the displayed one — so two source seasons remapped onto the same target
  // (e.g. S3→S1 when S1 already exists) stay SEPARATE, editable/resettable sections instead of merging into one.
  const SENTINEL_KEY = "_";
  const sourceSections = React.useMemo(() => {
    const groups = new Map<string, GenericEpisodeItem[]>();
    for (const e of episodes) {
      const key = e.rawSeason !== undefined ? String(e.rawSeason) : SENTINEL_KEY;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    const arr = Array.from(groups.entries()).map(([key, eps]) => {
      const raws = eps.map((e) => e.rawEpisode).filter((n): n is number => n !== undefined);
      return {
        key,
        rawSeason: eps[0].rawSeason as number | undefined,
        displayedSeason: eps[0].season,
        rawFirstEp: raws.length ? Math.min(...raws) : 1,
        episodes: eps,
      };
    });
    arr.sort((a, b) => (a.displayedSeason - b.displayedSeason) || ((a.rawSeason ?? 0) - (b.rawSeason ?? 0)));
    return arr;
  }, [episodes]);

  // The very first episode row across ALL sections gets the initial-focus key (Overlay lands here on open).
  const firstEpId = React.useMemo(() => sourceSections[0]?.episodes[0]?.id, [sourceSections]);

  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [uniqueSeasons, selectedSeason]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setEditingSource(null);
    }
  }, [isOpen]);

  // Re-land focus on the first episode row when the season changes (Overlay owns
  // the initial focus on open).
  useEffect(() => {
    if (!isOpen || isEditing) return;
    const t = setTimeout(() => {
      setFocus("EPISODE_SELECTOR_FIRST_ROW");
    }, 60);
    return () => clearTimeout(t);
  }, [isOpen, isEditing, selectedSeason, episodes.length]);

  // Pencil on a season section → open the TMDB picker scoped to THAT displayed section. The source season is the
  // raw parsed season of the section's files; the baseline is their RAW first episode.
  const handleEditSection = (section: { rawSeason: number | undefined; rawFirstEp: number }) => {
    setEditingSource({ sourceSeason: section.rawSeason ?? null, rawFirstEp: section.rawFirstEp });
    setIsEditing(true);
    if (onStartEditing) onStartEditing();
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditingSource(null);
  };

  // Picker returns the TMDB (targetSeason, targetEpisode) the section's FIRST file maps to → offset against the
  // RAW baseline (no compounding). onApplyOverride replaces this source season's mapping.
  const handleApplyOverrideInternal = (targetSeason: number, targetEp: number) => {
    if (onApplyOverride) {
      const rawFirstEp = editingSource?.rawFirstEp ?? 1;
      onApplyOverride(editingSource?.sourceSeason ?? null, targetSeason, targetEp - rawFirstEp);
    }
    setSelectedSeason(targetSeason);
    setEditingSource(null);
    setIsEditing(false);
  };

  const handleOpenAsPlaylist = () => {
    if (!episodes || episodes.length === 0) return;
    
    // 1. Map GenericEpisodeItem to PlaylistItem schema
    const getStreamUrl = (ep: any) => ep.url || (ep.audios && ep.audios[0]?.url) || "";
    
    const mappedPlaylist = episodes.map((ep) => {
      const streamUrl = getStreamUrl(ep);
      return {
        // `id` (torrent file index) lets the player lazily re-fetch a fresh descriptor per episode.
        id: ep.id,
        season: ep.season,
        episode: ep.episode,
        title: ep.title || t("episode.fallbackName", { number: ep.episode }),
        streamUrl,
        streamType: streamUrl.includes(".m3u8") ? "m3u8" : streamUrl.includes(".mpd") ? "dash" : "mp4",
        audios: ep.audios?.map((a: any) => ({ name: a.name, url: a.url || "" })),
        voice: ep.audios?.[0]?.name || t("selector.mainStream")
      } as any;
    }).filter(item => !!item.streamUrl);

    if (mappedPlaylist.length === 0) return;

    // 2. Save mapped playlist to window object override
    (window as any).potok_playlist_override = mappedPlaylist;

    // 3. Find the first unwatched episode, or fallback to first episode of selected season, or simply first episode
    const uncompleted = episodes.find(e => e.season === selectedSeason && !e.isWatched) 
      || episodes.find(e => !e.isWatched)
      || episodes.find(e => e.season === selectedSeason)
      || episodes[0];

    if (uncompleted) {
      onPlay(uncompleted, "default");
    }
  };

  const completedCount = episodes.filter(e => e.isWatched).length;
  const totalCount = episodes.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const tmdbCount = tmdbSeasonsCount || 1;
  const maxSeasonInBalancer = uniqueSeasons.length > 0 ? Math.max(...uniqueSeasons) : 1;
  const parsingFailed = maxSeasonInBalancer > tmdbCount;

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      focusKey="EPISODE_SELECTOR_MODAL"
      initialFocusKey="EPISODE_SELECTOR_FIRST_ROW"
      styled={false}
      backdropClassName="modal-overlay"
      className="modal-container"
      style={{ maxWidth: isEditing ? "62.5rem" : "53.125rem", display: "flex", flexDirection: "column" }}
    >
        <EpisodeSelectorHeader
          isEditing={isEditing}
          onClose={onClose}
          onBackToFiles={handleCancelEditing}
          title={title}
          subtitle={subtitle}
          mediaType={mediaType}
          completedCount={completedCount}
          totalCount={totalCount}
          percentage={percentage}
          parsingFailed={parsingFailed}
          onStartEditing={undefined}
          onOpenAsPlaylist={handleOpenAsPlaylist}
        />
        <div className="episode-popup-body" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {isEditing ? (
            <EpisodeOverridePicker
              seasons={seasons}
              seasonsLoading={seasonsLoading}
              onApplyOverride={handleApplyOverrideInternal}
            />
          ) : (
            <div className="files-list-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* All seasons in ONE scroll, grouped as sections ("Сезон 1" + its episodes, then "Сезон 2" …) —
                  in season/episode order, instead of top tabs that show only one season at a time. */}
              <div className="episode-popup-rows-list" style={{ padding: "1.25rem", flex: 1, overflowY: "auto" }}>
                {totalCount > 0 ? (
                  sourceSections.map((section) => {
                    const mapEntry = seasonMap[section.key];
                    const srcRaw = section.rawSeason;
                    return (
                      <div key={section.key} className="episode-season-group">
                        {mediaType === "tv" && (
                          <div className="season-section-header">
                            <h3 className="season-section-title">{t("selector.season", { number: section.displayedSeason })}</h3>
                            {mapEntry && (
                              <span className="season-map-badge">
                                {srcRaw !== undefined && srcRaw !== section.displayedSeason ? `S${srcRaw}→ ` : ""}
                                {mapEntry.offset >= 0 ? "+" : ""}{mapEntry.offset}
                              </span>
                            )}
                            <FocusableButton
                              focusKey={`SEASON_EDIT_${section.key}`}
                              className="season-edit-pencil"
                              onClick={() => handleEditSection(section)}
                              onEnterPress={() => handleEditSection(section)}
                              aria-label={t("selector.editSeasonMapping")}
                            >
                              <Pencil size="0.9375rem" />
                            </FocusableButton>
                            {mapEntry && onResetOverride && (
                              <FocusableButton
                                focusKey={`SEASON_RESET_${section.key}`}
                                className="season-edit-pencil"
                                onClick={() => onResetOverride(srcRaw ?? null)}
                                onEnterPress={() => onResetOverride(srcRaw ?? null)}
                                aria-label={t("selector.resetSeasonMapping")}
                              >
                                <RotateCcw size="0.9375rem" />
                              </FocusableButton>
                            )}
                          </div>
                        )}
                        {section.episodes.map((ep) => (
                          <EpisodeSelectorRow
                            key={ep.id}
                            episodeItem={ep}
                            mediaType={mediaType}
                            backdropSrc={backdropSrc}
                            posterSrc={posterSrc}
                            onPlay={() => onPlay(ep, "default")}
                            focusKey={ep.id === firstEpId ? "EPISODE_SELECTOR_FIRST_ROW" : undefined}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <div className="episode-popup-empty-files">
                    {t("selector.noEpisodes")}
                  </div>
                )}
              </div>
            </div>
          )}

          {isSaving && (
            <div className="saving-overlay">
              <div className="saving-content">
                <div className="premium-spinner" style={{ marginBottom: "0.75rem" }}>
                  <div className="spinner-outer" />
                  <div className="spinner-inner" />
                </div>
                <span>{t("selector.savingOffset")}</span>
              </div>
            </div>
          )}
        </div>
    </Overlay>
  );
};

export default EpisodeSelectorPopup;
