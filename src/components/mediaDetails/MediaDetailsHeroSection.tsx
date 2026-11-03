import React from "react";
import { useTranslation } from "react-i18next";
import { Star, Eye } from "lucide-react";
import { IconButton } from "../ui";
import { Slot } from "../common/extension/Slot";
import { MediaOverviewSection } from "../MediaOverviewSection";
import { StatusPickerMenu } from "./StatusPickerMenu";
import { FolderPickerMenu } from "./FolderPickerMenu";
import type { MediaCard, TvEpisode } from "../../network/ApiTypes";
import type { ArmGroupSummary } from "../../features/arm/armGroupDisplay";
import type { ArmMediaSummary } from "../../network/ArmTypes";
import type { TitleStatus, UserFolder } from "../../utils/userData";

interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
  groupTitle?: string;
}

interface MediaDetailsHeroSectionProps {
  media: MediaCard;
  groupSummary?: ArmGroupSummary;
  mediaId: number;
  tmdbId: number;
  mediaType?: string;
  armSummary?: ArmMediaSummary | null;
  selectedEpisode: SelectedEpisodeState | null;
  setSelectedEpisode: (value: SelectedEpisodeState | null) => void;
  isWatched: boolean;
  isFavorite: boolean;
  titleStatus: TitleStatus | null;
  folders: UserFolder[];
  folderMembership: Record<string, boolean>;
  toggleWatched: () => void;
  toggleFavorite: () => void;
  onSelectStatus: (status: TitleStatus | null) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<unknown>;
}

export const MediaDetailsHeroSection: React.FC<MediaDetailsHeroSectionProps> = ({
  media,
  groupSummary,
  mediaId,
  tmdbId,
  mediaType,
  armSummary,
  selectedEpisode,
  setSelectedEpisode,
  isWatched,
  isFavorite,
  titleStatus,
  folders,
  folderMembership,
  toggleWatched,
  toggleFavorite,
  onSelectStatus,
  onToggleFolder,
  onCreateFolder,
}) => {
  const { t } = useTranslation("media");

  return (
    <div className="immersive-hero-container">
        {media.backdropSrc && (
          <img
            src={media.backdropSrc}
            className="immersive-hero-backdrop details-hero-backdrop"
            alt=""
            decoding="async"
            onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
          />
        )}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          <div className="details-content-container">
            <div className="details-poster-sidebar">
              {media.logoSrc ? (
                <div className="details-logo-container">
                  <img src={media.logoSrc} className="details-logo" alt={media.title} />
                </div>
              ) : (
                <h1 className="details-title-fallback">{media.title}</h1>
              )}

              <div className="details-actions-container">
                <Slot
                  name="media-actions"
                  props={{
                    mediaId,
                    tmdbId,
                    mediaType,
                    title: media.title,
                    originalTitle: media.originalTitle,
                    media,
                    backdropSrc: media.backdropSrc,
                    workId: armSummary?.workId ?? media.arm?.workId,
                    entryId: selectedEpisode?.episode.armEntryId,
                    episodeId: selectedEpisode?.episode.armEpisodeId,
                    season: selectedEpisode?.episode.armEpisodeId
                      ? selectedEpisode.episode.tmdbSeasonNumber
                      : selectedEpisode?.seasonNumber,
                    episode: selectedEpisode?.episode.armEpisodeId
                      ? selectedEpisode.episode.tmdbEpisodeNumber
                      : selectedEpisode?.episode.episodeNumber,
                  }}
                />

                <div id="social-actions-row" className="details-actions-row">
                  <IconButton
                    className={`action-btn-circle ${isWatched ? "active" : ""}`}
                    onClick={toggleWatched}
                    title={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                    aria-label={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                  >
                    <Eye size="1.125rem" />
                  </IconButton>

                  <StatusPickerMenu
                    status={titleStatus}
                    isWatched={isWatched}
                    onSelectStatus={onSelectStatus}
                    onMarkWatched={toggleWatched}
                  />

                  <FolderPickerMenu
                    folders={folders}
                    membership={folderMembership}
                    onToggleFolder={onToggleFolder}
                    onCreateFolder={onCreateFolder}
                  />

                  <IconButton
                    className={`action-btn-circle ${isFavorite ? "active" : ""}`}
                    onClick={toggleFavorite}
                    title={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                    aria-label={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                  >
                    <Star size="1.125rem" fill={isFavorite ? "var(--accent)" : "none"} />
                  </IconButton>
                </div>
              </div>
            </div>

            <MediaOverviewSection
              media={media}
              groupSummary={groupSummary}
              selectedEpisode={selectedEpisode}
              setSelectedEpisode={setSelectedEpisode}
            />
          </div>
        </div>
      </div>
  );
};
