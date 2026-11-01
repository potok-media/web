export function resolvePlaybackDuration(metadataDuration: number, mediaDuration: number): number {
  if (Number.isFinite(metadataDuration) && metadataDuration > 0) return metadataDuration;
  if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
  return 0;
}

export function clampPlaybackTime(target: number, duration: number): number {
  const finiteTarget = Number.isFinite(target) ? target : 0;
  const lowerBoundedTarget = Math.max(0, finiteTarget);

  return Number.isFinite(duration) && duration > 0
    ? Math.min(lowerBoundedTarget, duration)
    : lowerBoundedTarget;
}
