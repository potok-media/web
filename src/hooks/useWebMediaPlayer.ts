import { useRef, useState } from "react";
import { useWebMediaPlayerBindings } from "./player/useWebMediaPlayerBindings";
import type { WebMediaPlayerOptions } from "./player/webMediaPlayerTypes";

export type { WebMediaPlayerOptions } from "./player/webMediaPlayerTypes";

export function useWebMediaPlayer({ playback, onClose, isNetworkOffline = false }: WebMediaPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
    playback,
    playerError,
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