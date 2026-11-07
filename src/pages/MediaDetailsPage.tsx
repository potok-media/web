import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useHUD } from "../context/useHUD";
import { Slot } from "../components/common/extension/Slot";

import { useMediaDetails } from "../hooks/useMediaDetails";
import { useMediaDetailsUserData } from "../hooks/mediaDetails/useMediaDetailsUserData";
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
import type { EpisodeSelection } from "../hooks/mediaDetails/mediaDetailsTypes";
import type { ArmGroupSummary } from "../features/arm/armGroupDisplay";
import type { ArmMediaSummary } from "../network/ArmTypes";
import type { ArmAnimeDetailsInput } from "../features/mediaDetails/armAnimeMedia";
import { animeExternalLinks, selectArmAnimeEntry } from "../features/mediaDetails/armAnimeMedia";


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
  /** Resolved ARM summary with workId from the canonical page — avoids a duplicate ARM fetch. */
  armSummary?: ArmMediaSummary | null;
  /**
   * Anime works without a TMDB bridge: the page renders from ARM identity (entries +
   * AniList/Shikimori metadata synthesized into the regular media card) instead of fetching
   * tmdb-keyed details. Favorites/watchlist stay tmdb-keyed and hide for this identity.
   */
  armAnime?: ArmAnimeDetailsInput;
}

export const MediaDetailsPage: React.FC<MediaDetailsPageProps> = ({
  resolvedMediaType,
  resolvedMediaId,
  resolvedGroupSummary,
  initialGroupId,
  armSummary,
  armAnime,
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
    workId: armAnime?.workId,
  });

  const {
    media,
    loading,
    error,
    refetch,
    isFavorite,
    isWatched,
    toggleFavorite,
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
    armAnime,
  });

  const normalizedMediaType =
    mediaType === "movie" || mediaType === "tv" ? mediaType : null;
  const userData = useMediaDetailsUserData({
    media,
    tmdbId: String(tmdbId),
    mediaType: normalizedMediaType,
    workId: armSummary?.workId ?? media?.arm?.workId ?? undefined,
    showHUD,
    t,
  });

  // History mutations change the server-derived effective status (auto-completed when the last
  // episode is marked, fallen back when the title is cleared) — re-pull it after each mutation's
  // reconciling refetch so the picker stays the single source of server truth.
  const { refreshStatus } = userData;
  const toggleWatchedWithStatus = useCallback(async () => {
    await toggleWatched();
    await refreshStatus();
  }, [toggleWatched, refreshStatus]);
  const toggleEpisodeWatchedWithStatus = useCallback(
    async (episode: TvEpisode, nextState: boolean) => {
      await toggleEpisodeWatched(episode, nextState);
      await refreshStatus();
    },
    [toggleEpisodeWatched, refreshStatus],
  );
  const toggleSeasonWatchedWithStatus = useCallback(
    async (
      seasonNumber: number | undefined,
      episodesList: TvEpisode[],
      nextState: boolean,
      groupTitle?: string,
    ) => {
      await toggleSeasonWatched(seasonNumber, episodesList, nextState, groupTitle);
      await refreshStatus();
    },
    [toggleSeasonWatched, refreshStatus],
  );
  const saveEpisodeSelectionWithStatus = useCallback(
    async (selection: EpisodeSelection[]) => {
      await saveEpisodeSelection(selection);
      await refreshStatus();
    },
    [saveEpisodeSelection, refreshStatus],
  );

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
  // Anime-only works carry no tmdb coordinate: the tmdb-keyed social surfaces (favorites,
  // status picker, the legacy multi-picker) hide; episode history stays workId-keyed.
  const hasTmdbIdentity = Number.isFinite(mediaId) && mediaId > 0;
  const animeEntry = armAnime ? selectArmAnimeEntry(armAnime.entries, initialGroupId) : null;
  const externalLinks = animeEntry ? animeExternalLinks(animeEntry) : [];
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
        armSummary={armSummary}
        selectedEpisode={selectedEpisode}
        setSelectedEpisode={setSelectedEpisode}
        isWatched={isWatched}
        isFavorite={isFavorite}
        titleStatus={userData.status}
        folders={userData.folders}
        folderMembership={userData.membership}
        toggleWatched={toggleWatchedWithStatus}
        toggleFavorite={toggleFavorite}
        onSelectStatus={userData.selectStatus}
        onToggleFolder={userData.toggleFolder}
        onCreateFolder={userData.createFolder}
        showSocialActions={hasTmdbIdentity}
      />

      <div className={`details-content-grid ${hasEpisodeLibrary ? "details-content-grid--series" : "details-content-grid--movie"}`}>
        <main className="details-primary-column">
          {hasEpisodeLibrary && (
            <div className="details-panel details-episodes-panel">
              <SeasonEpisodesSection
                mediaId={media.id}
                mediaTitle={media.title}
                numberOfSeasons={media.numberOfSeasons ?? 0}
                arm={armSummary ?? media.arm}
                armEnabled
                initialGroupId={initialGroupId}
                selectedEpisode={selectedEpisode}
                onEpisodeClick={(ep, seasonNum, groupTitle) => {
                  setSelectedEpisode({ episode: ep, seasonNumber: seasonNum, groupTitle });
                }}
                watchedEpisodes={media.progress?.watchedEpisodes || []}
                watchedEpisodeIds={media.progress?.watchedEpisodeIds || []}
                toggleEpisodeWatched={toggleEpisodeWatchedWithStatus}
                toggleSeasonWatched={toggleSeasonWatchedWithStatus}
                onOpenMultiPicker={hasTmdbIdentity ? () => setIsMultiPickerOpen(true) : undefined}
              />
            </div>
          )}

          {hasEpisodeLibrary && <hr className="details-section-divider" />}

          {!hasEpisodeLibrary && cast.length > 0 && (
            <MediaCastSection cast={cast} variant="wide" />
          )}

          <Slot name="details-bottom" props={detailsSlotProps} className="details-extension-slot" />

          {isMultiPickerOpen && hasEpisodeLibrary && hasTmdbIdentity && (
            <EpisodeMultiPickerModal
              isOpen={isMultiPickerOpen}
              onClose={() => setIsMultiPickerOpen(false)}
              mediaId={media.id}
              mediaTitle={media.title}
              numberOfSeasons={media.numberOfSeasons ?? 0}
              initialSelected={media.progress?.watchedEpisodes || []}
              onSave={saveEpisodeSelectionWithStatus}
            />
          )}
        </main>

        <aside className="details-side-column">
          <MediaDetailsInfoSection media={media} links={externalLinks} />
          <hr className="details-section-divider" />
          {hasEpisodeLibrary && cast.length > 0 && (
            <MediaCastSection cast={cast} variant="compact" />
          )}
          {hasEpisodeLibrary && cast.length > 0 && <hr className="details-section-divider" />}
          <MediaRelatedSection />
        </aside>
      </div>
    </div>
  );
};

export default MediaDetailsPage;
