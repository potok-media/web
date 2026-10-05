import type { ArmEpisodeFiller, ArmEpisodeLayoutResponse, ArmTmdbCoordinate } from "../../../network/ArmTypes";
import type { SDKArmBindingTarget, SDKEpisodeBindingOverride } from "../../../sdk/src/types";
import type { EpisodeSourceSection, FileOverrideEntry, FileOverrideMode } from "./types";

export interface ArmOverrideEpisode {
  target: SDKArmBindingTarget;
  ordinal: string;
  title: string;
  stillPath?: string | null;
  airDate?: string | null;
  filler?: ArmEpisodeFiller | null;
  tmdb?: ArmTmdbCoordinate | null;
}

export interface ArmOverrideGroup {
  id: string;
  kind: string;
  title: string;
  displayNumber?: number | null;
  tmdbShow?: number | null;
  tmdbSeason?: number | null;
  episodes: ArmOverrideEpisode[];
}

/**
 * Maps the v2 graph layout to picker groups. Groups arrive in the backend's kind-aware order
 * with episodes ordered by number; every canonical entry stays intact — equal display numbers
 * are not equal identities. Group titles ride the layout (resolved from the structure source
 * at read time); per-episode titles/stills overlay from TMDB by the `tmdb` coordinate on the
 * consumer side.
 */
export function toArmOverrideGroups(layout: ArmEpisodeLayoutResponse | null | undefined): ArmOverrideGroup[] {
  const workId = layout?.work?.id;
  if (!workId) return [];
  return layout.groups.flatMap((group) => {
    if (!group.id) return [];
    const episodes = group.episodes
      .filter((episode) => episode.id)
      .map((episode): ArmOverrideEpisode => ({
        target: { workId, entryId: group.id, episodeId: episode.id },
        ordinal: typeof episode.number === "number" && Number.isFinite(episode.number)
          ? String(episode.number) : "",
        title: "",
        filler: episode.filler,
        tmdb: episode.tmdb ?? null,
      }));
    if (!episodes.length) return [];
    return [{
      id: group.id,
      kind: group.kind,
      title: group.title ?? "",
      displayNumber: typeof group.number === "number" && Number.isFinite(group.number) ? group.number : null,
      tmdbShow: group.tmdbShow ?? null,
      tmdbSeason: group.tmdbSeason ?? null,
      episodes,
    }];
  });
}

export function buildEpisodeBindingOverride({
  target,
  sections,
  editingFile,
  editingSectionKey,
}: {
  target: SDKArmBindingTarget;
  sections: EpisodeSourceSection[];
  editingFile: { id: string; mode: FileOverrideMode } | null;
  editingSectionKey?: string;
}): SDKEpisodeBindingOverride | null {
  const section = editingFile
    ? sections.find((candidate) => candidate.episodes.some((episode) => episode.id === editingFile.id))
    : sections.find((candidate) => candidate.key === editingSectionKey);
  if (!section) return null;
  const fileId = editingFile?.id ?? section.episodes[0]?.id;
  if (!fileId) return null;
  const mode = editingFile?.mode ?? "anchor";
  if (mode === "pin") return { fileId, mode, armTarget: target };
  const start = section.episodes.findIndex((episode) => episode.id === fileId);
  const scopeFileIds = [...new Set(section.episodes.slice(start).map((episode) => episode.id))];
  return { fileId, mode, armTarget: target, scopeFileIds };
}

/** An anchor can span multiple rendered groups after the files have been rebound. */
export function sectionBindingAnchorIds(
  section: EpisodeSourceSection,
  fileMap: Record<string, FileOverrideEntry>,
): string[] {
  const sectionIds = new Set(section.episodes.map((episode) => episode.id));
  return Object.entries(fileMap)
    .filter(([fileId, entry]) => entry.armTarget && entry.mode === "anchor" &&
      (sectionIds.has(fileId) || entry.scopeFileIds?.some((id) => sectionIds.has(id))))
    .map(([fileId]) => fileId);
}
