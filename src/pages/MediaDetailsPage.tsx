import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { MediaDetailsInfoSection, MediaRelatedSection } from "../components/mediaDetails/MediaDetailsRail";
import { getArmEntriesCached, getArmEpisodesCached, getArmResolveCached } from "../features/arm/armLayoutCache";
import { reconstructLayout } from "../features/arm/layoutReconstruction";
import { resolveLegacyRedirect } from "../features/arm/armGroupSelection";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import type { ArmGroupSummary } from "../features/arm/armGroupDisplay";


interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
  groupTitle?: string;
}

interface MediaDetailsPageProps {
  /**
   * Canonical /media/p route: the identity was already resolved from the ARM layout, so these
   * override the tmdb-keyed route params. Absent on the legacy route — the page then resolves
   * the work itself and redirects to the canonical URL when the graph knows it.
   */
  resolvedMediaType?: string;
  resolvedMediaId?: number;
  /** Source-aware count from the canonical layout; split parts are not extra seasons. */
  resolvedGroupSummary?: ArmGroupSummary;
  /** The ARM entry (layout group) the page opens on — the canonical deep link. */
  initialGroupId?: string;
}

export const MediaDetailsPage: React.FC<MediaDetailsPageProps> = ({
  resolvedMediaType,
  resolvedMediaId,
  resolvedGroupSummary,
  initialGroupId,
}) => {
  const params = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();

  const mediaType = resolvedMediaType ?? params.mediaType;
  const mediaId = resolvedMediaId ?? Number(params.id);
  const tmdbId = mediaId;

  const { t, i18n } = useTranslation("media");
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();

  // Legacy tmdb-keyed URL → canonical potok URL when the graph knows the work: resolve, then
  // land on the entry whose bridge coordinate IS this tmdb id (a franchise member must not
  // open the franchise's main season). A resolve miss queues server-side hydration; an old or
  // unreachable gateway keeps the legacy TMDB page entirely — that IS the fallback.
  useEffect(() => {
    if (resolvedMediaId != null) return;
    if (!mediaType || !Number.isFinite(mediaId)) return;
    const controller = new AbortController();
    const reference = { provider: "tmdb", entityKind: mediaType, value: String(mediaId) };
    void (async () => {
      try {
        const resolved = await getArmResolveCached(reference, i18n.language, (ifNoneMatch) =>
          ApiClient.resolveArmWork(reference, {
            locale: i18n.language,
            signal: controller.signal,
            ifNoneMatch,
          }), false);
        if (!resolved.workId || controller.signal.aborted) return;
        const workId = resolved.workId;
        const [entriesRes, episodesRes] = await Promise.all([
          getArmEntriesCached(workId, undefined, i18n.language, (ifNoneMatch) =>
            ApiClient.getArmEntries(workId, { locale: i18n.language, signal: controller.signal, ifNoneMatch }), false),
          getArmEpisodesCached(workId, undefined, i18n.language, (ifNoneMatch) =>
            ApiClient.getArmEpisodes(workId, { locale: i18n.language, signal: controller.signal, ifNoneMatch }), false),
        ]);
        if (controller.signal.aborted) return;
        const layout = reconstructLayout(entriesRes.entries, episodesRes.episodes, workId, i18n.language);
        const target = resolveLegacyRedirect(layout, mediaId);
        if (!target) return;
        const next = new URLSearchParams(searchParams);
        next.set("g", target.entryId);
        navigate(`/media/p/${resolved.workId}?${next.toString()}`, { replace: true });
      } catch {
        /* ARM off or an old gateway: stay on the legacy page */
      }
    })();
    return () => controller.abort();
    // searchParams identity changes per navigation; the redirect fires once per page identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMediaId, mediaType, mediaId, i18n.language]);

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
  const hasEpisodeLibrary = media.mediaType === "tv" && ((media.numberOfSeasons ?? 0) > 0 || Boolean(media.arm?.workId));
  const detailsSlotProps = {
    mediaId,
    tmdbId,
    mediaType,
    title: media.title,
    originalTitle: media.originalTitle,
    media,
  };

  return (
    <div className={`details-layout ${layoutModifier}`}>
      <MediaDetailsHeroSection
        media={media}
        groupSummary={resolvedGroupSummary}
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

      <div className={`details-content-grid ${hasEpisodeLibrary ? "details-content-grid--series" : "details-content-grid--movie"}`}>
        <main className="details-primary-column">
          {hasEpisodeLibrary && (
            <div className="details-panel details-episodes-panel">
              <SeasonEpisodesSection
                mediaId={media.id}
                mediaTitle={media.title}
                numberOfSeasons={media.numberOfSeasons ?? 0}
                arm={media.arm}
                armEnabled
                initialGroupId={initialGroupId}
                selectedEpisode={selectedEpisode}
                onEpisodeClick={(ep, seasonNum, groupTitle) => {
                  setSelectedEpisode({ episode: ep, seasonNumber: seasonNum, groupTitle });
                }}
                watchedEpisodes={media.progress?.watchedEpisodes || []}
                watchedEpisodeIds={media.progress?.watchedEpisodeIds || []}
                toggleEpisodeWatched={toggleEpisodeWatched}
                toggleSeasonWatched={toggleSeasonWatched}
                onOpenMultiPicker={() => setIsMultiPickerOpen(true)}
              />
            </div>
          )}

          {!hasEpisodeLibrary && cast.length > 0 && (
            <MediaCastSection cast={cast} variant="wide" />
          )}

          <Slot name="details-bottom" props={detailsSlotProps} className="details-extension-slot" />

          {isMultiPickerOpen && hasEpisodeLibrary && (
            <EpisodeMultiPickerModal
              isOpen={isMultiPickerOpen}
              onClose={() => setIsMultiPickerOpen(false)}
              mediaId={media.id}
              mediaTitle={media.title}
              numberOfSeasons={media.numberOfSeasons ?? 0}
              initialSelected={media.progress?.watchedEpisodes || []}
              onSave={saveEpisodeSelection}
            />
          )}
        </main>

        <aside className="details-side-column">
          <MediaDetailsInfoSection media={media} />
          {hasEpisodeLibrary && cast.length > 0 && (
            <MediaCastSection cast={cast} variant="compact" />
          )}
          <MediaRelatedSection />
        </aside>
      </div>
    </div>
  );
};

export default MediaDetailsPage;
