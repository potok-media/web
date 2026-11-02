import { useEffect, useState, type RefObject } from "react";

const VOLUME_KEY = "potok_player_volume";
const MUTED_KEY = "potok_player_muted";

export function usePlayerVolumePrefs(
  srcResetCounter: number,
  videoRef: RefObject<HTMLVideoElement | null>,
  videoNode?: HTMLVideoElement | null,
) {
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved !== null ? Number(saved) : 0.75;
  });
  const [isMuted, setIsMuted] = useState<boolean>(
    () => localStorage.getItem(MUTED_KEY) === "true",
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