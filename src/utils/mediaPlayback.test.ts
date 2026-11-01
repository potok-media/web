import { describe, expect, it, vi } from "vitest";
import { startMediaPlayback } from "./mediaPlayback";

function media(play: () => Promise<void>) {
  return { muted: false, play } as Pick<HTMLMediaElement, "muted" | "play">;
}

describe("startMediaPlayback", () => {
  it("starts with the current audio state when autoplay is allowed", async () => {
    const video = media(vi.fn().mockResolvedValue(undefined));

    await expect(startMediaPlayback(video)).resolves.toEqual({ started: true, mutedRetry: false });
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(false);
  });

  it("retries muted when playback with sound is blocked", async () => {
    const play = vi.fn()
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
      .mockResolvedValueOnce(undefined);
    const video = media(play);

    await expect(startMediaPlayback(video)).resolves.toEqual({ started: true, mutedRetry: true });
    expect(play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(true);
  });

  it("returns the final failure instead of swallowing it", async () => {
    const finalError = new DOMException("decode failed", "NotSupportedError");
    const play = vi.fn()
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
      .mockRejectedValueOnce(finalError);
    const video = media(play);

    await expect(startMediaPlayback(video)).resolves.toEqual({
      started: false,
      mutedRetry: true,
      error: finalError,
    });
  });
});
