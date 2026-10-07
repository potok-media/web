import type { ArmLayoutGroup } from "../../network/ArmTypes";

/** Presentation only: these numbers never replace graph ordinals or provider coordinates. */
export type ArmGroupLabel =
  | { kind: "season"; number: number; part?: number }
  | { kind: "part"; number: number; title?: string }
  | { kind: "title"; title: string };

export interface ArmGroupSummary {
  kind: "seasons" | "parts";
  count: number;
}

interface ParsedTitle {
  base: string;
  season?: number;
  part?: number;
}

// Deliberately narrow: numbers elsewhere (86, 2024, II, named arcs, Final Season) are titles.
const PART_SUFFIX = /\s+(?:part|cour)\s+([1-9]\d*)$/i;
const SEASON_SUFFIX = /^(.*?)\s+(?:([1-9]\d*)(?:st|nd|rd|th)?\s+season|season\s+([1-9]\d*))$/i;
const normalize = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase();

function parseTitle(title: string): ParsedTitle {
  const part = PART_SUFFIX.exec(title);
  const withoutPart = part ? title.slice(0, part.index) : title;
  const season = SEASON_SUFFIX.exec(withoutPart);
  const seasonNumber = season ? Number(season[2] ?? season[3]) : undefined;
  const partNumber = part ? Number(part[1]) : undefined;
  if ((seasonNumber != null && !Number.isSafeInteger(seasonNumber))
    || (partNumber != null && !Number.isSafeInteger(partNumber))) return { base: title };
  return {
    base: (season?.[1] ?? withoutPart).trim(),
    season: seasonNumber,
    part: partNumber,
  };
}

/**
 * Only explicit Season N / Nth Season suffixes identify season numbers. The unnumbered
 * first entry is season 1 only when its exact title is the base of those numbered entries.
 * Split parts share a season label; named/ambiguous releases retain the source title.
 */
export function resolveArmGroupLabels(groups: ArmLayoutGroup[]): Map<string, ArmGroupLabel> {
  const visible = groups.filter(group => group.episodes.length > 0);
  const main = visible.filter(group => group.kind === "season");
  const parsed = new Map(main.map(group => [group.id, parseTitle(group.title?.trim() ?? "")]));
  const seasonBases = new Set([...parsed.values()]
    .filter(value => value.season != null && value.base).map(value => normalize(value.base)));
  // A work can contain several related series. Compact numbers would erase that distinction.
  const candidateBase = seasonBases.size === 1 ? [...seasonBases][0] : undefined;
  const seasonBase = candidateBase && main.every(group => {
    const base = normalize(parsed.get(group.id)!.base);
    return base === candidateBase || (base.startsWith(candidateBase) && /^[\s:]/.test(base.slice(candidateBase.length)));
  }) ? candidateBase : undefined;
  const hasSource = visible.some(group => group.title?.trim() || group.aniListId != null);
  const labels = new Map<string, ArmGroupLabel>();

  for (const group of visible) {
    const title = group.title?.trim();
    if (!title) {
      if (hasSource && group.kind === "season") labels.set(group.id, { kind: "part", number: group.number });
      continue;
    }
    const value = parsed.get(group.id);
    if (!value) {
      labels.set(group.id, { kind: "title", title });
      continue;
    }
    const base = normalize(value.base);
    const numbered = seasonBase === base && value.season != null;
    const root = seasonBase === base && value.season == null
      && !main.some(other => parsed.get(other.id)?.season === 1);
    if (numbered || root) {
      const number = value.season ?? 1;
      const split = main.some(other => {
        const candidate = parsed.get(other.id)!;
        return normalize(candidate.base) === base && (candidate.season ?? 1) === number
          && candidate.part != null;
      });
      labels.set(group.id, { kind: "season", number, part: value.part ?? (split ? 1 : undefined) });
      continue;
    }
    const split = main.some(other => normalize(parsed.get(other.id)!.base) === base
      && parsed.get(other.id)!.part != null);
    if (split && value.season == null) {
      const onlyBase = main.every(other => normalize(parsed.get(other.id)!.base) === base);
      labels.set(group.id, { kind: "part", number: value.part ?? 1, title: onlyBase ? undefined : value.base });
    } else {
      labels.set(group.id, { kind: "title", title });
    }
  }
  return labels;
}

/** Count seasons only when every main entry has an unambiguous season identity. */
export function summarizeArmGroups(groups: ArmLayoutGroup[]): ArmGroupSummary {
  const main = groups.filter(group => group.kind === "season" && group.episodes.length > 0);
  const labels = resolveArmGroupLabels(groups);
  if (main.every(group => !labels.has(group.id))) return { kind: "seasons", count: main.length };
  const seasons = main.map(group => labels.get(group.id))
    .filter((label): label is Extract<ArmGroupLabel, { kind: "season" }> => label?.kind === "season");
  if (seasons.length === main.length) {
    return { kind: "seasons", count: new Set(seasons.map(label => label.number)).size };
  }
  return { kind: "parts", count: main.length };
}
