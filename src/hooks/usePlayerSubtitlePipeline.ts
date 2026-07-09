import {
  useCallback,
  useMemo,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { SubtitlesOctopusInstance } from "./useSubtitlesOctopus";
import { useSubtitleReadiness } from "./subtitles/useSubtitleReadiness";
import { useSubtitleSeekVisibility } from "./subtitles/useSubtitleSeekVisibility";
import { useSubtitleCueOffset } from "./subtitles/useSubtitleCueOffset";
import { useWindowedSubtitleFeeder } from "./subtitles/useWindowedSubtitleFeeder";
import { useSubtitleTrackUpload } from "./subtitles/useSubtitleTrackUpload";
import type { InjectedSubtitleTrack, SubtitleTrackUiItem } from "./subtitles/subtitleTypes";

export type { InjectedSubtitleTrack } from "./subtitles/subtitleTypes";

interface UsePlayerSubtitlePipelineParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  seekOffsetRef: RefObject<number>;
  seekOffset: number;
  seekPreview: number | null;
  srcResetCounter: number;
  currentSubtitleTrack: number;
  injectedSubtitles: InjectedSubtitleTrack[];
  setInjectedSubtitles: Dispatch<SetStateAction<InjectedSubtitleTrack[]>>;
  setCurrentSubtitleTrack: (index: number) => void;
  subtitleFetchPromises: RefObject<Record<string, Promise<string> | undefined>>;
  fetchSubtitleWindow: (track: InjectedSubtitleTrack, bucket: number) => Promise<string> | null;
  octopusRef: RefObject<SubtitlesOctopusInstance | null>;
  subtitleTracks: SubtitleTrackUiItem[];
  isMetadataLoading: boolean;
}

export function usePlayerSubtitlePipeline(params: UsePlayerSubtitlePipelineParams) {
  const {
    videoRef,
    seekOffsetRef,
    seekOffset,
    seekPreview,
    srcResetCounter,
    currentSubtitleTrack,
    injectedSubtitles,
    setInjectedSubtitles,
    setCurrentSubtitleTrack,
    subtitleFetchPromises,
    fetchSubtitleWindow,
    octopusRef,
    subtitleTracks,
    isMetadataLoading,
  } = params;

  const { subtitleBlobUrls, subtitleState, subtitleGen, markSubtitle } = useSubtitleReadiness(
    injectedSubtitles,
    currentSubtitleTrack,
    srcResetCounter,
    subtitleFetchPromises,
  );

  useSubtitleSeekVisibility(seekPreview, videoRef, seekOffsetRef, octopusRef);

  const cueOriginalTimes = useSubtitleCueOffset(
    videoRef,
    seekOffset,
    currentSubtitleTrack,
    injectedSubtitles,
    srcResetCounter,
  );

  useWindowedSubtitleFeeder(
    videoRef,
    currentSubtitleTrack,
    injectedSubtitles,
    fetchSubtitleWindow,
    markSubtitle,
    subtitleGen,
    octopusRef,
    seekOffsetRef,
    cueOriginalTimes,
  );

  const switchSubtitle = useCallback(
    (id: number) => setCurrentSubtitleTrack(id),
    [setCurrentSubtitleTrack],
  );

  const { handleUploadSubtitle, handleAddSubtitleUrl } = useSubtitleTrackUpload({
    injectedSubtitles,
    setInjectedSubtitles,
    subtitleBlobUrls,
    subtitleFetchPromises,
    subtitleGen,
    markSubtitle,
    switchSubtitle,
  });

  const subtitleTracksUi = useMemo(
    () =>
      subtitleTracks.map((item) => {
        const st = item.stableId ? subtitleState[item.stableId] : "ready";
        const loading = item.id === currentSubtitleTrack && !!item.stableId && !st;
        return { ...item, loading, error: st === "error" };
      }),
    [subtitleTracks, subtitleState, currentSubtitleTrack],
  );

  const subtitlesLoading =
    isMetadataLoading || subtitleTracksUi.some((track) => track.loading);

  return {
    subtitleBlobUrls,
    subtitleTracksUi,
    subtitlesLoading,
    switchSubtitle,
    handleUploadSubtitle,
    handleAddSubtitleUrl,
  };
}