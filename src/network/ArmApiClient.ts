import type {
  ArmEpisodeId,
  ArmEpisodeLayoutResponse,
  ArmGraphVersion,
  ArmProviderReference,
  ArmResolveResponse,
  ArmReleaseVariantSegmentsResponse,
  ArmWorkId,
  ArmWorkResponse,
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
  ordering?: "default" | string;
}

export interface ArmSegmentsRequestOptions extends ArmRequestOptions {
  durationMs: number;
}

export interface ArmClient {
  resolveWork(
    reference: ArmProviderReference,
    options?: ArmRequestOptions,
  ): Promise<ArmHttpResponse<ArmResolveResponse>>;
  getWork(
    workId: ArmWorkId,
    options?: ArmRequestOptions,
  ): Promise<ArmHttpResponse<ArmWorkResponse>>;
  getEpisodeLayout(
    workId: ArmWorkId,
    options?: ArmLayoutRequestOptions,
  ): Promise<ArmHttpResponse<ArmEpisodeLayoutResponse>>;
  getEpisodeSegments(
    episodeId: ArmEpisodeId,
    options: ArmSegmentsRequestOptions,
  ): Promise<ArmHttpResponse<ArmReleaseVariantSegmentsResponse>>;
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
        "/api/arm/v1/resolve",
        segment(reference.provider),
        segment(reference.entityKind),
        segment(reference.value),
      ].join("/");
      return transport.get<ArmResolveResponse>(
        appendQuery(path, { locale: options?.locale }),
        requestOptions(options),
      );
    },

    getWork(workId, options) {
      const path = `/api/arm/v1/works/${segment(workId)}`;
      return transport.get<ArmWorkResponse>(
        appendQuery(path, { locale: options?.locale }),
        requestOptions(options),
      );
    },

    getEpisodeLayout(workId, options) {
      const path = `/api/arm/v1/works/${segment(workId)}/layout`;
      return transport.get<ArmEpisodeLayoutResponse>(
        appendQuery(path, {
          ordering: options?.ordering ?? "default",
          locale: options?.locale,
        }),
        requestOptions(options),
      );
    },

    getEpisodeSegments(episodeId, options) {
      return transport.get<ArmReleaseVariantSegmentsResponse>(
        appendQuery(`/api/arm/v1/episodes/${segment(episodeId)}/segments`, {
          durationMs: String(options.durationMs),
        }),
        requestOptions(options),
      );
    },
  };
}
