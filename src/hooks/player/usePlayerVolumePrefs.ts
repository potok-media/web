import { useEffect, useState, type RefObject } from "react";

const DEFAULT_STORAGE_KEY_PREFIX = "potok_player";

export function usePlayerVolumePrefs(
  srcResetCounter: number,
  videoRef: RefObject<HTMLVideoElement | null>,
  videoNode?: HTMLVideoElement | null,
  storageKeyPrefix: string = DEFAULT_STORAGE_KEY_PREFIX,
) {
  const volumeKey = `${storageKeyPrefix}_volume`;
  const mutedKey = `${storageKeyPrefix}_muted`;
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(volumeKey);
    return saved !== null ? Number(saved) : 0.75;
  });
  const [isMuted, setIsMuted] = useState<boolean>(
    () => localStorage.getItem(mutedKey) === "true",
  );

  useEffect(() => {
    const video = videoNode !== undefined ? videoNode : videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [srcResetCounter, volume, isMuted, videoNode, videoRef]);

  return { volume, setVolume, isMuted, setIsMuted };
}