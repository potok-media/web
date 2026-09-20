import type {
  ArmEpisodeLayoutResponse,
  ArmProviderReference,
  ArmResolveResponse,
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

export interface ArmHttpTransport {
  get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T>;
}

export interface ArmRequestOptions {
  locale?: string;
  signal?: AbortSignal;
}

export interface ArmLayoutRequestOptions extends ArmRequestOptions {
  ordering?: "default" | string;
}

export interface ArmClient {
  resolveWork(reference: ArmProviderReference, options?: ArmRequestOptions): Promise<ArmResolveResponse>;
  getWork(workId: ArmWorkId, options?: ArmRequestOptions): Promise<ArmWorkResponse>;
  getEpisodeLayout(
    workId: ArmWorkId,
    options?: ArmLayoutRequestOptions,
  ): Promise<ArmEpisodeLayoutResponse>;
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

export function createArmApiClient(transport: ArmHttpTransport): ArmClient {
  return {
    resolveWork(reference, options) {
      const path = [
        "/api/arm/v1/resolve",
        segment(reference.provider),
        segment(reference.entityKind),
        segment(reference.value),
      ].join("/");
      return transport.get<ArmResolveResponse>(appendQuery(path, { locale: options?.locale }), {
        signal: options?.signal,
      });
    },

    getWork(workId, options) {
      const path = `/api/arm/v1/works/${segment(workId)}`;
      return transport.get<ArmWorkResponse>(appendQuery(path, { locale: options?.locale }), {
        signal: options?.signal,
      });
    },

    getEpisodeLayout(workId, options) {
      const path = `/api/arm/v1/works/${segment(workId)}/layout`;
      return transport.get<ArmEpisodeLayoutResponse>(
        appendQuery(path, {
          ordering: options?.ordering ?? "default",
          locale: options?.locale,
        }),
        { signal: options?.signal },
      );
    },
  };
}
