import { useCallback, useEffect, useState } from "react";
import type { ActivePlayback } from "../context/playbackTypes";

export function usePlayerResumeToast(
  playback: ActivePlayback,
  isMetadataLoading: boolean,
) {
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  useEffect(() => {
    if (isMetadataLoading) return;
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    const savedResume = localStorage.getItem(resumeKey);
    if (savedResume && !showResumeToast) {
      const parsed = Number(savedResume);
      if (!isNaN(parsed) && parsed > 15) {
        setResumeTime(parsed);
        setShowResumeToast(true);
        const timer = setTimeout(() => setShowResumeToast(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isMetadataLoading, playback.id, playback.season, playback.episode, showResumeToast]);

  const resetResumeToast = useCallback(() => {
    setShowResumeToast(false);
    setResumeTime(0);
  }, []);

  return {
    showResumeToast,
    setShowResumeToast,
    resumeTime,
    resetResumeToast,
  };
}