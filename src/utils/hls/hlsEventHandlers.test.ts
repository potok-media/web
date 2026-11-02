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
    recoverMediaError: vi.fn(),
  } as unknown as Hls;
  const setAudioTracks = vi.fn();
  const setCurrentAudioTrack = vi.fn();
  const setPlayerError = vi.fn();
  const setIsMetadataLoading = vi.fn();

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
      setIsMetadataLoading,
      setPlayerError,
      manageHlsAudioTracks,
    },
  );

  return { hls, listeners, setAudioTracks, setCurrentAudioTrack, setPlayerError, setIsMetadataLoading };
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

describe("bindHlsEventHandlers fatal error policy", () => {
  const fatalMediaError = {
    type: Hls.ErrorTypes.MEDIA_ERROR,
    details: "fragParsingError",
    fatal: true,
  };
  const fatalNetworkError = {
    type: Hls.ErrorTypes.NETWORK_ERROR,
    details: "levelLoadError",
    fatal: true,
  };

  it("recovers from the first fatal media error instead of showing the error overlay", () => {
    const { hls, listeners, setPlayerError, setIsMetadataLoading } = createHarness(true);

    listeners.get(Hls.Events.ERROR)?.(Hls.Events.ERROR, fatalMediaError);

    expect(hls.recoverMediaError).toHaveBeenCalledTimes(1);
    expect(setPlayerError).not.toHaveBeenCalled();
    expect(setIsMetadataLoading).toHaveBeenCalledWith(true);
  });

  it("shows the error overlay when a second fatal error arrives after recovery", () => {
    const { listeners, setPlayerError } = createHarness(true);

    listeners.get(Hls.Events.ERROR)?.(Hls.Events.ERROR, fatalMediaError);
    listeners.get(Hls.Events.ERROR)?.(Hls.Events.ERROR, fatalMediaError);

    expect(setPlayerError).toHaveBeenCalledTimes(1);
  });

  it("never recovers from fatal network errors", () => {
    const { hls, listeners, setPlayerError } = createHarness(true);

    listeners.get(Hls.Events.ERROR)?.(Hls.Events.ERROR, fatalNetworkError);

    expect(hls.recoverMediaError).not.toHaveBeenCalled();
    expect(setPlayerError).toHaveBeenCalledTimes(1);
  });
});
