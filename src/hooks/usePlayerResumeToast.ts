import { playbackStorageKeys } from "../utils/playbackIdentity";
import { useCallback, useEffect, useState } from "react";
import type { ActivePlayback } from "../context/playbackTypes";

export function usePlayerResumeToast(
  playback: ActivePlayback,
  isMetadataLoading: boolean,
) {
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  const resumeKey = playbackStorageKeys(playback).resumeKey;

  useEffect(() => {
    if (isMetadataLoading || playback.startAtZero) return; // no resume prompt in co-watch
    if (typeof playback.startAt === "number" && playback.startAt > 0) return; // explicit continue already seeked
    const savedResume = localStorage.getItem(resumeKey);
    if (!savedResume) return;
    const parsed = Number(savedResume);
    if (isNaN(parsed) || parsed <= 15) return;
    setResumeTime(parsed);
    setShowResumeToast(true);
    // Auto-hide after 5s. `showResumeToast` MUST NOT be a dependency: the effect flips it to true, which would
    // re-run the effect and its cleanup would clearTimeout this hide-timer before it fires — leaving the toast
    // stuck on screen. Deps are only the episode identity + loading flag, so the timer survives to completion.
    const timer = setTimeout(() => setShowResumeToast(false), 5000);
    return () => clearTimeout(timer);
  }, [isMetadataLoading, resumeKey, playback.startAtZero, playback.startAt]);

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