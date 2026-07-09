import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaDetailsPageNavigationParams {
  mediaType?: string;
  mediaId: number;
}

export function useMediaDetailsPageNavigation({
  mediaType,
  mediaId,
}: UseMediaDetailsPageNavigationParams) {
  const navigate = useNavigate();
  const mediaRef = useRef<MediaCard | null>(null);

  const handleNavigateToStreams = useCallback((tab?: string, season?: number, episode?: number) => {
    const path = tab
      ? `/media/${mediaType}/${mediaId}/streams/${tab}`
      : `/media/${mediaType}/${mediaId}/streams`;

    const params = new URLSearchParams();
    if (season !== undefined) params.set("season", String(season));
    if (episode !== undefined) params.set("episode", String(episode));

    const searchStr = params.toString();
    const targetPath = searchStr ? `${path}?${searchStr}` : path;

    navigate(targetPath, { state: { media: mediaRef.current } });
  }, [mediaType, mediaId, navigate]);

  return { mediaRef, handleNavigateToStreams };
}