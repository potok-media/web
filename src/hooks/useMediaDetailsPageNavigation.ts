import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaDetailsPageNavigationParams {
  mediaType?: string;
  mediaId: number;
  /** ARM work identity — play navigates by workId when there is no tmdb coordinate. */
  workId?: string;
}

export function useMediaDetailsPageNavigation({
  mediaType,
  mediaId,
  workId,
}: UseMediaDetailsPageNavigationParams) {
  const navigate = useNavigate();
  const mediaRef = useRef<MediaCard | null>(null);

  const handleNavigateToStreams = useCallback((tab?: string, season?: number, episode?: number) => {
    const params = new URLSearchParams();
    if (season !== undefined) params.set("season", String(season));
    if (episode !== undefined) params.set("episode", String(episode));

    // Anime-only works have no tmdb coordinate: the streams page keys off ?workId= and the
    // synthesized card rides along in the location state (no TMDB refetch there).
    const armWorkRoute = workId && !mediaId;
    if (armWorkRoute) params.set("workId", workId);

    const path = armWorkRoute
      ? `/media/${mediaType}/0/watch${tab ? `/${tab}` : ""}`
      : tab
        ? `/media/${mediaType}/${mediaId}/watch/${tab}`
        : `/media/${mediaType}/${mediaId}/watch`;

    const searchStr = params.toString();
    const targetPath = searchStr ? `${path}?${searchStr}` : path;

    navigate(targetPath, {
      state: {
        media: mediaRef.current,
        ...(armWorkRoute ? { workId } : {}),
        ...(season !== undefined ? { season } : {}),
        ...(episode !== undefined ? { episode } : {}),
      },
    });
  }, [mediaType, mediaId, workId, navigate]);

  return { mediaRef, handleNavigateToStreams };
}