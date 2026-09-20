import { describe, it, expect } from "vitest";
import { SDK_TYPINGS } from "./sdkTypings";

// The plugin-facing .d.ts surface is a hand-maintained string, invisible to ESLint and tsc.
// This guard fails if an `any` type ever creeps back into it. It matches TYPE positions only
// (`: any`, `any[]`, `<any>`, `Promise<any>`), never the English word "any" in prose.
describe("SDK_TYPINGS strong typing", () => {
  it("assembles to a non-empty surface", () => {
    expect(SDK_TYPINGS.length).toBeGreaterThan(1000);
  });

  it("contains no `any` type", () => {
    const matches = SDK_TYPINGS.match(/:\s*any\b|\bany\[\]|<any>|Promise<any>/g) ?? [];
    expect(matches).toEqual([]);
  });

  it("defines the domain types the builders reference", () => {
    for (const name of [
      "SDKStreamUIItem",
      "SDKMediaCard",
      "SDKCastMember",
      "SDKTvEpisode",
      "SDKTvSeason",
      "SDKStreamEpisode",
      "SDKConnectionProfile",
      "SDKContentItem",
      "SDKPlaybackInfo",
      "SDKArmProviderReference",
      "SDKArmResolveResponse",
      "SDKArmEpisodeLayoutResponse",
      "SDKReleaseBindingTarget",
    ]) {
      expect(SDK_TYPINGS).toContain(`interface ${name}`);
    }
  });

  it("exposes the typed Potok ARM surface", () => {
    expect(SDK_TYPINGS).toContain("arm: {");
    expect(SDK_TYPINGS).toContain("resolveWork(reference: SDKArmProviderReference");
    expect(SDK_TYPINGS).toContain("getEpisodeLayout(workId: string");
    expect(SDK_TYPINGS).toContain("episodeIds?: string[]");
    expect(SDK_TYPINGS).toContain("targets?: SDKReleaseBindingTarget[]");
  });
});
