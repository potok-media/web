import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { useHUD } from "../context/useHUD";
import { Slot } from "../components/common/extension/Slot";

import { useMediaDetails } from "../hooks/useMediaDetails";
import { useMediaDetailsAutoPlay } from "../hooks/useMediaDetailsAutoPlay";
import { useMediaDetailsPageNavigation } from "../hooks/useMediaDetailsPageNavigation";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaCastSection } from "../components/MediaCastSection";
import { EpisodeMultiPickerModal } from "../components/EpisodeMultiPickerModal";
import { MediaDetailsErrorView } from "../components/mediaDetails/MediaDetailsErrorView";
import { MediaDetailsHeroSection } from "../components/mediaDetails/MediaDetailsHeroSection";
import type { TvEpisode } from "../network/ApiTypes";


interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
}

export const MediaDetailsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();

  const mediaId = Number(id);
  const tmdbId = mediaId;

  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const layoutModifier = isMobile
    ? "details-layout--mobile"
    : "details-layout--desktop";

  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);
  const [isMultiPickerOpen, setIsMultiPickerOpen] = useState(false);

  const { mediaRef, handleNavigateToStreams } = useMediaDetailsPageNavigation({
    mediaType,
    mediaId,
  });

  const {
    media,
    loading,
    error,
    refetch,
    isFavorite,
    inWatchlist,
    isWatched,
    toggleFavorite,
    toggleWatchlist,
    toggleWatched,
    toggleEpisodeWatched,
    toggleSeasonWatched,
    saveEpisodeSelection,
  } = useMediaDetails({
    mediaType,
    mediaId,
    playParam: searchParams.get("play"),
    onNavigateToStreams: (season, episode) => handleNavigateToStreams(undefined, season, episode),
    showHUD,
  });

  useEffect(() => {
    mediaRef.current = media;
  }, [media, mediaRef]);

  useMediaDetailsAutoPlay({
    loading,
    media,
    playParam: searchParams.get("play"),
    seasonParam: searchParams.get("season"),
    episodeParam: searchParams.get("episode"),
    handleNavigateToStreams,
  });

  if (loading) return <LoadingSpinner />;
  if (error || !media) return <MediaDetailsErrorView error={error || t("details.loadError")} onRetry={refetch} />;

  const cast = media.cast || [];

  return (
    <div className={`details-layout ${layoutModifier}`}>
      <MediaDetailsHeroSection
        media={media}
        mediaId={mediaId}
        tmdbId={tmdbId}
        mediaType={mediaType}
        selectedEpisode={selectedEpisode}
        setSelectedEpisode={setSelectedEpisode}
        isWatched={isWatched}
        inWatchlist={inWatchlist}
        isFavorite={isFavorite}
        toggleWatched={toggleWatched}
        toggleWatchlist={toggleWatchlist}
        toggleFavorite={toggleFavorite}
      />

      <div className="details-bottom-sections">
        {media.mediaType === "tv" && media.numberOfSeasons !== undefined && media.numberOfSeasons > 0 && (
          <div className="details-fullwidth-section">
            <SeasonEpisodesSection
              mediaId={media.id}
              numberOfSeasons={media.numberOfSeasons!}
              selectedEpisode={selectedEpisode}
              onEpisodeClick={(ep, seasonNum) => {
                setSelectedEpisode({ episode: ep, seasonNumber: seasonNum });
              }}
              watchedEpisodes={media.progress?.watchedEpisodes || []}
              toggleEpisodeWatched={toggleEpisodeWatched}
              toggleSeasonWatched={toggleSeasonWatched}
              onOpenMultiPicker={() => setIsMultiPickerOpen(true)}
            />

            {isMultiPickerOpen && (
              <EpisodeMultiPickerModal
                isOpen={isMultiPickerOpen}
                onClose={() => setIsMultiPickerOpen(false)}
                mediaId={media.id}
                mediaTitle={media.title}
                numberOfSeasons={media.numberOfSeasons!}
                initialSelected={media.progress?.watchedEpisodes || []}
                onSave={saveEpisodeSelection}
              />
            )}
          </div>
        )}

        <Slot
          name="details-bottom"
          props={{
            mediaId,
            tmdbId,
            mediaType,
            title: media.title,
            originalTitle: media.originalTitle,
            media,
          }}
        />

        {cast.length > 0 && (
          <MediaCastSection cast={cast} />
        )}
      </div>
    </div>
  );
};

export default MediaDetailsPage;