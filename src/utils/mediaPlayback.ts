export interface MediaPlaybackResult {
  started: boolean;
  mutedRetry: boolean;
  error?: unknown;
}

/** play() rejected because something paused the element mid-request — expected when a co-watch
 *  start-gate hold races the autoplay on episode switch. NOT a playback failure. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Start an HTML media element without assuming that autoplay with sound is allowed.
 * The caller owns error presentation; this function only guarantees that the final
 * rejection is returned instead of disappearing in an empty catch handler.
 */
export async function startMediaPlayback(
  media: Pick<HTMLMediaElement, "muted" | "play">,
): Promise<MediaPlaybackResult> {
  try {
    await media.play();
    return { started: true, mutedRetry: false };
  } catch {
    media.muted = true;
    try {
      await media.play();
      return { started: true, mutedRetry: true };
    } catch (error) {
      return { started: false, mutedRetry: true, error };
    }
  }
}
