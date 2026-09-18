/** Compact override summary copied from SearchEngine search results (optional on older engines). */
export type StreamOverrideSummary = {
  seasonCount: number;
  fileCount: number;
  primarySource?: string;
  primarySeason?: number;
  primaryOffset?: number;
};

const ARROW = "→";
const MINUS = "−";
const DOT = "·";
const SENTINEL_SOURCE = "_";

export type OverrideBadge = { label: string; title?: string };

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatSignedOffset(offset: number): string {
  if (offset < 0) return `${MINUS}${Math.abs(offset)}`;
  return `+${offset}`;
}

function isSentinelSource(source: string | undefined): boolean {
  return source === undefined || source === null || source === "" || source === SENTINEL_SOURCE;
}

/** One remapped season: `S1→S2`, or `S2 +3` / `S2 −1` when source is target or sentinel `_`. */
export function formatOneSeasonLabel(override: StreamOverrideSummary): string | undefined {
  if (override.primarySeason === undefined || override.primarySeason === null) return undefined;
  const target = Number(override.primarySeason);
  if (!Number.isFinite(target)) return undefined;

  const sourceRaw = override.primarySource;
  const sourceNum = isSentinelSource(sourceRaw) ? NaN : Number(sourceRaw);
  const offset = override.primaryOffset ?? 0;

  if (Number.isFinite(sourceNum) && sourceNum !== target) {
    return `S${sourceNum}${ARROW}S${target}`;
  }
  return `S${target} ${formatSignedOffset(offset)}`;
}

export function formatOverrideBadge(
  override: StreamOverrideSummary | null | undefined,
  t: TranslateFn,
): OverrideBadge | undefined {
  if (!override) return undefined;
  const seasonCount = Number(override.seasonCount) || 0;
  const fileCount = Number(override.fileCount) || 0;
  if (seasonCount <= 0 && fileCount <= 0) return undefined;

  const seasonPart =
    seasonCount === 1
      ? formatOneSeasonLabel(override) || String(t("row.overrideSeasons", { count: 1 }))
      : seasonCount > 1
        ? String(t("row.overrideSeasons", { count: seasonCount }))
        : "";
  const filePart = fileCount > 0 ? String(t("row.overrideFiles", { count: fileCount })) : "";

  if (seasonPart && filePart) return { label: `${seasonPart} ${DOT} ${filePart}` };
  if (seasonPart) return { label: seasonPart };
  if (filePart) return { label: filePart };
  return undefined;
}

export function overrideSummaryFromMaps(
  seasonMap?: Record<string, { season: number; offset: number }> | null,
  fileMap?: Record<string, unknown> | null,
): StreamOverrideSummary | undefined {
  const seasonKeys = seasonMap ? Object.keys(seasonMap) : [];
  const fileKeys = fileMap ? Object.keys(fileMap) : [];
  if (seasonKeys.length === 0 && fileKeys.length === 0) return undefined;

  const summary: StreamOverrideSummary = {
    seasonCount: seasonKeys.length,
    fileCount: fileKeys.length,
  };
  if (seasonKeys.length === 1 && seasonMap) {
    const source = seasonKeys[0];
    const entry = seasonMap[source];
    summary.primarySource = source;
    summary.primarySeason = entry?.season;
    summary.primaryOffset = entry?.offset;
  }
  return summary;
}
