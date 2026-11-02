import { useCallback, useRef, useState } from "react";
import { useWebMediaPlayerBindings } from "./player/useWebMediaPlayerBindings";
import type { WebMediaPlayerOptions } from "./player/webMediaPlayerTypes";

export type { WebMediaPlayerOptions } from "./player/webMediaPlayerTypes";

export function useWebMediaPlayer({ playback, onClose, isNetworkOffline = false }: WebMediaPlayerOptions) {
  // The portal container can change after mount (PlaybackWorkspace registers its surface one render
  // after the player first portals into document.body) and React RECREATES the <video> node on a
  // portal container change instead of moving it. Hooks that capture the node in effects must key on
  // `videoNode` (state, updated by this callback) so the media pipeline re-attaches to the new node;
  // `videoRef` stays a stable object whose .current the callback keeps in sync for lazy readers.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoNode(node);
  }, []);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [seekOffset, setSeekOffset] = useState(0);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const bindings = useWebMediaPlayerBindings({
    playback,
    onClose,
    videoRef,
    videoNode,
    videoRefCallback,
    overlayRef,
    isPlaying,
    duration,
    seekOffset,
    seekPreview,
    isBuffering,
    setIsPlaying,
    setDuration,
    setSeekOffset,
    setSeekPreview,
    setIsBuffering,
    setPlayerError,
    setIsClosed,
  });

  return {
    isClosed,
    isNetworkOffline,
    overlayRef,
    videoRef,
    videoNode,
    videoRefCallback,
    playback,
    playerError,
    setPlayerError,
    showStats,
    setShowStats,
    isPlaying,
    setIsPlaying,
    setIsMetadataLoading: bindings.metadata.setIsMetadataLoading,
    setIsBuffering,
    setSeekPreview,
    setDuration,
    seekOffset,
    seekPreview,
    ...bindings,
  };
}
