/** Stable Potok-owned identities. Provider ids must never be used in their place. */
export type ArmWorkId = string;
export type ArmEpisodeId = string;
export type ArmOrderingId = string;
export type ArmEpisodeGroupId = string;
export type ArmGraphVersion = string;

export type ArmEpisodeRelation = "canon" | "mixed" | "filler" | "recap" | "unknown";
export type ArmWatchRecommendation = "essential" | "recommended" | "optional" | "skip" | "unknown";
export type ArmAdaptationBasis = "manga" | "lightNovel" | "novel" | "comic" | "game" | "other";
export type ArmPublicationPolicy =
  | "public"
  | "potok-owned"
  | "redistributable"
  | "derived"
  | "local-only"
  | "query-only"
  | "non-redistributable"
  | "withheld";

export type ArmResolutionState =
  | "resolved"
  | "partial"
  | "ambiguous"
  | "disputed"
  | "unresolved"
  | "providerError"
  | "withheld"
  | "confirmedNone"
  | "notApplicable";

export type ArmCoverageState =
  | "complete"
  | "partial"
  | "ambiguous"
  | "unresolved"
  | "withheld"
  | "stale"
  | "providerFallback";

export interface ArmProviderReference {
  provider: string;
  entityKind: string;
  value: string;
}

export interface ArmWarning {
  code: string;
  message: string;
}

export type ArmNameRole =
  | "original"
  | "official"
  | "common"
  | "alias"
  | "romanized"
  | "short"
  | "working";

export interface ArmLocalizedText {
  value: string;
  requestedLocale?: string | null;
  resolvedLocale?: string | null;
  role: ArmNameRole;
  usedFallback: boolean;
}

/** All published title assertions, including ru/en/original-script variants. */
export interface ArmName {
  value: string;
  locale?: string | null;
  script?: string | null;
  role: ArmNameRole;
  sourceId?: string | null;
}

export interface ArmResponseEnvelope {
  graphVersion: ArmGraphVersion | null;
  resolutionState: ArmResolutionState;
  coverageState: ArmCoverageState;
  warnings: ArmWarning[];
}

export interface ArmWorkSummary {
  id: ArmWorkId;
  kind: string;
  defaultOrderingId: ArmOrderingId | null;
  displayTitle: ArmLocalizedText | null;
  names?: ArmName[];
  providerReferences: ArmProviderReference[];
}

export interface ArmResolveResponse extends ArmResponseEnvelope {
  query: ArmProviderReference;
  work: ArmWorkSummary | null;
  alternatives: ArmWorkSummary[];
}

export interface ArmWorkResponse extends ArmResponseEnvelope {
  work: ArmWorkSummary | null;
}

export interface ArmEpisodePlacement {
  id: ArmEpisodeId;
  groupId: ArmEpisodeGroupId;
  ordinal: string;
  sortPosition: number;
  displayTitle: ArmLocalizedText | null;
  names?: ArmName[];
  displaySeasonNumber?: number | null;
  displayEpisodeNumber?: number | null;
  overview?: string | null;
  stillPath?: string | null;
  airDate?: string | null;
  providerReferences: ArmProviderReference[];
  annotation?: ArmEpisodeAnnotationSummary | null;
}

export interface ArmEpisodeAnnotationEvidence {
  id: string;
  episodeId: ArmEpisodeId;
  relation: ArmEpisodeRelation;
  recommendation: ArmWatchRecommendation;
  confidence: number;
  sourceId: string;
  provenance?: string | null;
  publicationPolicy: ArmPublicationPolicy;
  adaptationBasis?: ArmAdaptationBasis | null;
}

export interface ArmEpisodeAnnotationSummary {
  episodeId: ArmEpisodeId;
  resolutionState: ArmResolutionState;
  relation: ArmEpisodeRelation;
  recommendation: ArmWatchRecommendation;
  confidence: number;
  evidence: ArmEpisodeAnnotationEvidence[];
}

export interface ArmEpisodeAnnotationsResponse extends ArmResponseEnvelope {
  episodes: ArmEpisodeAnnotationSummary[];
}

export interface ArmEpisodeGroup {
  id: ArmEpisodeGroupId;
  kind: string;
  displayNumber?: number | null;
  sortPosition: number;
  displayTitle: ArmLocalizedText | null;
  names?: ArmName[];
  episodes: ArmEpisodePlacement[];
}

export interface ArmEpisodeOrdering {
  id: ArmOrderingId;
  kind: string;
  isDefault: boolean;
}

export interface ArmEpisodeLayoutResponse extends ArmResponseEnvelope {
  workId: ArmWorkId;
  ordering: ArmEpisodeOrdering | null;
  groups: ArmEpisodeGroup[];
}

/** Additive identity summary attached to legacy TMDB-shaped media cards. */
export interface ArmMediaSummary {
  workId: ArmWorkId | null;
  defaultOrderingId: ArmOrderingId | null;
  graphVersion: ArmGraphVersion | null;
  resolutionState: ArmResolutionState;
  coverageState: ArmCoverageState;
  warnings?: ArmWarning[];
}

export function canReadArmLayout(summary: ArmMediaSummary | null | undefined): summary is ArmMediaSummary & {
  workId: ArmWorkId;
} {
  if (!summary?.workId) return false;
  return summary.resolutionState === "resolved" || summary.resolutionState === "partial";
}
