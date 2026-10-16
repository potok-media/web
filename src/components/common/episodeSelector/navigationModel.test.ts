import { describe, expect, it } from "vitest";
import { getEpisodeSelectorNavigationModel } from "./navigationModel";

describe("episode selector navigation", () => {
  it("shows only close at the root of an active playlist", () => {
    expect(getEpisodeSelectorNavigationModel({
      presentation: "playlist",
      isEditing: false,
      repairMode: false,
    })).toEqual({ isNestedView: false, showBackNavigation: false, showCloseNavigation: true });
  });

  it("keeps back and close separate while editing", () => {
    expect(getEpisodeSelectorNavigationModel({
      presentation: "playlist",
      isEditing: true,
      repairMode: true,
    })).toEqual({ isNestedView: true, showBackNavigation: true, showCloseNavigation: true });
  });

  it("keeps close at the playlist root before playback starts", () => {
    expect(getEpisodeSelectorNavigationModel({
      presentation: "playlist",
      isEditing: false,
      repairMode: false,
    })).toEqual({ isNestedView: false, showBackNavigation: false, showCloseNavigation: true });
  });
});
