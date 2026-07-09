import { useCallback, useRef, type RefObject, type MutableRefObject } from "react";
import type { ActivePlayback } from "../../context/playbackTypes";

interface UseStreamRefreshParams {
  playback: ActivePlayback;
  videoRef: RefObject<HTMLVideoElement | null>;
  seekOffsetRef: MutableRefObject<number>;
}

export function useStreamRefresh({ playback, videoRef, seekOffsetRef }: UseStreamRefreshParams) {
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const handleRefreshStream = useCallback(() => {
    const current = playbackRef.current;
    const resumeKey = `potok_playback_resume:${current.id}:${current.season ?? 0}:${current.episode ?? 0}`;
    const video = videoRef.current;
    const currentLoc = video ? video.currentTime : 0;
    const seekedTime =
      seekOffsetRef.current > 0 ? seekOffsetRef.current + currentLoc : currentLoc;
    localStorage.setItem(resumeKey, Math.floor(seekedTime).toString());

    if (current.providerId) {
      window.dispatchEvent(
        new CustomEvent("potok:refresh-stream-url", {
          detail: {
            providerId: current.providerId,
            mediaId: current.id,
            mediaType: current.mediaType,
            season: current.season,
            episode: current.episode,
            voice: current.voice,
          },
        }),
      );
    } else {
      window.location.reload();
    }
  }, [videoRef, seekOffsetRef]);

  return handleRefreshStream;
}