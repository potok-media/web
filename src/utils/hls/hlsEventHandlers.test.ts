import Hls from "hls.js";
import { describe, expect, it, vi } from "vitest";
import { bindHlsEventHandlers } from "./hlsEventHandlers";

function createHarness(manageHlsAudioTracks: boolean) {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const hls = {
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, listener);
    }),
    levels: [],
    config: {},
    currentLevel: -1,
    audioTrack: 0,
  } as unknown as Hls;
  const setAudioTracks = vi.fn();
  const setCurrentAudioTrack = vi.fn();

  bindHlsEventHandlers(
    hls,
    {} as HTMLVideoElement,
    3,
    {
      hlsRef: { current: hls },
      playerSessionRef: { current: 3 },
      syncNativeTextTracksRef: { current: vi.fn() },
    },
    {
      setAudioTracks,
      setCurrentAudioTrack,
      setRawLevels: vi.fn(),
      setCurrentQualityLevel: vi.fn(),
      setHlsActiveLevel: vi.fn(),
      setIsMetadataLoading: vi.fn(),
      setPlayerError: vi.fn(),
      manageHlsAudioTracks,
    },
  );

  return { listeners, setAudioTracks, setCurrentAudioTrack };
}

describe("bindHlsEventHandlers audio ownership", () => {
  it("does not replace plugin voice variants with audio_1 from a provider manifest", () => {
    const { listeners, setAudioTracks, setCurrentAudioTrack } = createHarness(false);

    listeners.get(Hls.Events.AUDIO_TRACKS_UPDATED)?.(Hls.Events.AUDIO_TRACKS_UPDATED, {
      audioTracks: [{ name: "audio_1" }],
    });
    listeners.get(Hls.Events.AUDIO_TRACK_SWITCHED)?.(Hls.Events.AUDIO_TRACK_SWITCHED, { id: 0 });

    expect(setAudioTracks).not.toHaveBeenCalled();
    expect(setCurrentAudioTrack).not.toHaveBeenCalled();
  });

  it("still exposes in-manifest HLS tracks when there are no plugin voice variants", () => {
    const { listeners, setAudioTracks, setCurrentAudioTrack } = createHarness(true);

    listeners.get(Hls.Events.AUDIO_TRACKS_UPDATED)?.(Hls.Events.AUDIO_TRACKS_UPDATED, {
      audioTracks: [{ name: "Русская" }, { lang: "en" }],
    });

    expect(setAudioTracks).toHaveBeenCalledWith([
      { id: 0, name: "Русская" },
      { id: 1, name: "en" },
    ]);
    expect(setCurrentAudioTrack).toHaveBeenCalledWith(0);
  });
});
