import { describe, expect, it, vi } from "vitest";
import { leaveCoWatchSession } from "./coWatchExit";

describe("leaveCoWatchSession", () => {
  it("closes a host room without destroying the active player", () => {
    const leaveRoom = vi.fn();
    const stopVideo = vi.fn();
    const navigateBack = vi.fn();

    leaveCoWatchSession({
      role: "host",
      shouldNavigateBack: false,
      leaveRoom,
      stopVideo,
      navigateBack,
    });

    expect(leaveRoom).toHaveBeenCalledOnce();
    expect(stopVideo).not.toHaveBeenCalled();
    expect(navigateBack).not.toHaveBeenCalled();
  });

  it("keeps guest teardown behavior and can navigate back", () => {
    const leaveRoom = vi.fn();
    const stopVideo = vi.fn();
    const navigateBack = vi.fn();

    leaveCoWatchSession({
      role: "guest",
      shouldNavigateBack: true,
      leaveRoom,
      stopVideo,
      navigateBack,
    });

    expect(leaveRoom).toHaveBeenCalledOnce();
    expect(stopVideo).toHaveBeenCalledOnce();
    expect(navigateBack).toHaveBeenCalledOnce();
  });
});
