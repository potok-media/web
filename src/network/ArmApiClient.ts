import type {
  ArmEpisodeId,
  ArmEntryId,
  ArmEpisodeLayoutResponse,
  ArmEpisodeSegmentsResponse,
  ArmEntriesResponse,
  ArmEpisodesResponse,
  ArmExternalIdsResponse,
  ArmGraphVersion,
  ArmGraphVersionResponse,
  ArmLocalizedTitlesResponse,
  ArmProviderReference,
  ArmResolveResponse,
  ArmWorkCardResponse,
  ArmWorkId,
} from "./ArmTypes";

export class ArmApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ArmApiError";
    this.status = status;
    Object.setPrototypeOf(this, ArmApiError.prototype);
  }
}

/**
 * Raw ARM response. `status: 304` means the caller's `If-None-Match` validator still holds and
 * `body` is absent — that is a cache hit, not an error.
 */
export interface ArmHttpResponse<T> {
  status: number;
  etag: string | null;
  graphVersion: ArmGraphVersion | null;
  body?: T;
}

export interface ArmTransportGetOptions {
  signal?: AbortSignal;
  ifNoneMatch?: string;
}

export interface ArmHttpTransport {
  get<T>(
    path: string,
    options?: ArmTransportGetOptions,
  ): Promise<ArmHttpResponse<T>>;
}

export interface ArmRequestOptions {
  locale?: string;
  signal?: AbortSignal;
  ifNoneMatch?: string;
}

export interface ArmLayoutRequestOptions extends ArmRequestOptions {
  /** Optional single-entry slice: the layout then carries only the group with this entryId. */
  groupId?: ArmEntryId;
}

export interface ArmSegmentsRequestOptions extends ArmRequestOptions {
  durationMs: number;
}

export interface ArmClient {
  resolveWork(
    reference: ArmProviderReference,
    options?: ArmRequestOptions,
  ): Promise<ArmHttpResponse<ArmResolveResponse>>;
  getEpisodeLayout(
    workId: ArmWorkId,
    options?: ArmLayoutRequestOptions,
  ): Promise<ArmHttpResponse<ArmEpisodeLayoutResponse>>;
  getEpisodeSegments(
    episodeId: ArmEpisodeId,
    options: ArmSegmentsRequestOptions,
  ): Promise<ArmHttpResponse<ArmEpisodeSegmentsResponse>>;

  // ── New endpoint methods ──────────────────────────────────────────
  getGraphVersion(options?: ArmRequestOptions): Promise<ArmHttpResponse<ArmGraphVersionResponse>>;
  getWorkCard(workId: ArmWorkId, options?: ArmRequestOptions): Promise<ArmHttpResponse<ArmWorkCardResponse>>;
  getLocalizedTitles(workId: ArmWorkId, options?: ArmRequestOptions): Promise<ArmHttpResponse<ArmLocalizedTitlesResponse>>;
  getExternalIds(workId: ArmWorkId, options?: ArmRequestOptions): Promise<ArmHttpResponse<ArmExternalIdsResponse>>;
  getEntries(
    workId: ArmWorkId,
    options?: ArmRequestOptions & { kind?: string },
  ): Promise<ArmHttpResponse<ArmEntriesResponse>>;
  getEpisodes(
    workId: ArmWorkId,
    options?: ArmRequestOptions & { groupId?: ArmEntryId },
  ): Promise<ArmHttpResponse<ArmEpisodesResponse>>;
}

function appendQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

const segment = (value: string): string => encodeURIComponent(value);

const requestOptions = (options?: ArmRequestOptions) => ({
  signal: options?.signal,
  ifNoneMatch: options?.ifNoneMatch,
});

export function createArmApiClient(transport: ArmHttpTransport): ArmClient {
  return {
    resolveWork(reference, options) {
      const path = [
        "/api/arm/v1/works/resolve",
        segment(reference.provider),
        segment(reference.entityKind),
        segment(reference.value),
      ].join("/");
      return transport.get<ArmResolveResponse>(
        appendQuery(path, { locale: options?.locale }),
        requestOptions(options),
      );
    },

    getEpisodeLayout(workId, options) {
      const path = `/api/arm/v1/works/${segment(workId)}/layout`;
      return transport.get<ArmEpisodeLayoutResponse>(
        appendQuery(path, {
          groupId: options?.groupId,
          locale: options?.locale,
        }),
        requestOptions(options),
      );
    },

    getEpisodeSegments(episodeId, options) {
      return transport.get<ArmEpisodeSegmentsResponse>(
        appendQuery(`/api/arm/v1/episodes/${segment(episodeId)}/segments`, {
          durationMs: String(options.durationMs),
        }),
        requestOptions(options),
      );
    },

    // ── New endpoint implementations ──────────────────────────────────

    getGraphVersion(options) {
      return transport.get<ArmGraphVersionResponse>("/api/arm/v1/version", requestOptions(options));
    },

    getWorkCard(workId, options) {
      return transport.get<ArmWorkCardResponse>(
        `/api/arm/v1/works/${segment(workId)}`,
        requestOptions(options),
      );
    },

    getLocalizedTitles(workId, options) {
      return transport.get<ArmLocalizedTitlesResponse>(
        `/api/arm/v1/works/${segment(workId)}/localized-titles`,
        requestOptions(options),
      );
    },

    getExternalIds(workId, options) {
      return transport.get<ArmExternalIdsResponse>(
        `/api/arm/v1/works/${segment(workId)}/external-ids/simple`,
        requestOptions(options),
      );
    },

    getEntries(workId, options) {
      const query: Record<string, string> = {};
      if (options?.locale) query.locale = options.locale;
      if (options?.kind) query.kind = options.kind;
      return transport.get<ArmEntriesResponse>(
        appendQuery(`/api/arm/v1/works/${segment(workId)}/entries`, query),
        requestOptions(options),
      );
    },

    getEpisodes(workId, options) {
      const query: Record<string, string> = {};
      if (options?.locale) query.locale = options.locale;
      if (options?.groupId) query.groupId = options.groupId;
      return transport.get<ArmEpisodesResponse>(
        appendQuery(`/api/arm/v1/works/${segment(workId)}/episodes`, query),
        requestOptions(options),
      );
    },
  };
}
