import type { ArmEpisodeAnnotationSummary, ArmEpisodeLayoutResponse } from "../../../network/ArmTypes";
import type { SDKArmBindingTarget, SDKEpisodeBindingOverride } from "../../../sdk/src/types";
import type { EpisodeSourceSection, FileOverrideEntry, FileOverrideMode } from "./types";

export interface ArmOverrideEpisode {
  target: SDKArmBindingTarget;
  ordinal: string;
  title: string;
  stillPath?: string | null;
  airDate?: string | null;
  annotation?: ArmEpisodeAnnotationSummary | null;
}

export interface ArmOverrideGroup {
  id: string;
  kind: string;
  title: string;
  displayNumber?: number | null;
  episodes: ArmOverrideEpisode[];
}

/** Keep every canonical group intact: equal display numbers are not equal identities. */
export function toArmOverrideGroups(layout: ArmEpisodeLayoutResponse | null | undefined): ArmOverrideGroup[] {
  if (!layout?.workId || !layout.ordering?.id ||
    (layout.resolutionState !== "resolved" && layout.resolutionState !== "partial")) return [];
  const workId = layout.workId;
  const orderingId = layout.ordering.id;
  return [...layout.groups].sort((a, b) => a.sortPosition - b.sortPosition).flatMap((group) => {
    if (!group.id) return [];
    const episodes = [...group.episodes]
      .sort((a, b) => a.sortPosition - b.sortPosition)
      .filter((episode) => episode.id && episode.groupId === group.id)
      .map((episode): ArmOverrideEpisode => ({
        target: { workId, orderingId, groupId: group.id, episodeId: episode.id },
        ordinal: episode.ordinal?.trim() || (
          typeof episode.displayEpisodeNumber === "number" && Number.isFinite(episode.displayEpisodeNumber)
            ? String(episode.displayEpisodeNumber) : ""
        ),
        title: episode.displayTitle?.value?.trim() || episode.names?.find((name) => name.value?.trim())?.value || "",
        stillPath: episode.stillPath,
        airDate: episode.airDate,
        annotation: episode.annotation,
      }));
    if (!episodes.length) return [];
    return [{
      id: group.id,
      kind: group.kind,
      title: group.displayTitle?.value?.trim() || group.names?.find((name) => name.value?.trim())?.value || "",
      displayNumber: group.displayNumber,
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
