import { HttpClient, type HttpResponse } from "./http";
import type {
  SDKArmEpisodeLayoutResponse,
  SDKArmProviderReference,
  SDKArmResolveResponse,
  SDKArmWorkResponse,
} from "../types";

export class SDKArmError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SDKArmError";
    this.status = status;
    Object.setPrototypeOf(this, SDKArmError.prototype);
  }
}

export interface SDKArmTransport {
  get(path: string, options?: { timeoutMs?: number }): Promise<HttpResponse<unknown>>;
}

export interface SDKArmRequestOptions {
  locale?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SDKArmLayoutRequestOptions extends SDKArmRequestOptions {
  ordering?: "default" | string;
}

export interface SDKArmClient {
  resolveWork(
    reference: SDKArmProviderReference,
    options?: SDKArmRequestOptions,
  ): Promise<SDKArmResolveResponse>;
  getWork(workId: string, options?: SDKArmRequestOptions): Promise<SDKArmWorkResponse>;
  getEpisodeLayout(
    workId: string,
    options?: SDKArmLayoutRequestOptions,
  ): Promise<SDKArmEpisodeLayoutResponse>;
}

export interface SDKArmClientDefaults {
  getLocale?: () => string | undefined;
}

function query(path: string, values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

function abortError(): DOMException {
  return new DOMException("The ARM request was aborted", "AbortError");
}

function withCancellation<T>(request: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (!signal) return request();

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    request().then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function parseResponse<T>(response: HttpResponse<unknown>): T {
  if (response.status < 200 || response.status >= 300) {
    throw new SDKArmError(`Potok ARM request failed with status ${response.status}`, response.status);
  }
  if (typeof response.data !== "string") return response.data as T;
  try {
    return JSON.parse(response.data) as T;
  } catch {
    throw new SDKArmError("Potok ARM returned invalid JSON", response.status);
  }
}

export function createArmSdkClient(
  transport: SDKArmTransport,
  defaults: SDKArmClientDefaults = {},
): SDKArmClient {
  const get = <T>(path: string, options?: SDKArmRequestOptions): Promise<T> =>
    withCancellation(
      async () => parseResponse<T>(await transport.get(path, { timeoutMs: options?.timeoutMs })),
      options?.signal,
    );

  return {
    resolveWork(reference, options) {
      const locale = options?.locale ?? defaults.getLocale?.();
      const path = [
        "/api/arm/v1/resolve",
        encodeURIComponent(reference.provider),
        encodeURIComponent(reference.entityKind),
        encodeURIComponent(reference.value),
      ].join("/");
      return get<SDKArmResolveResponse>(query(path, { locale }), options);
    },

    getWork(workId, options) {
      const locale = options?.locale ?? defaults.getLocale?.();
      return get<SDKArmWorkResponse>(
        query(`/api/arm/v1/works/${encodeURIComponent(workId)}`, { locale }),
        options,
      );
    },

    getEpisodeLayout(workId, options) {
      const locale = options?.locale ?? defaults.getLocale?.();
      return get<SDKArmEpisodeLayoutResponse>(
        query(`/api/arm/v1/works/${encodeURIComponent(workId)}/layout`, {
          ordering: options?.ordering ?? "default",
          locale,
        }),
        options,
      );
    },
  };
}

export const ArmSdkClient: SDKArmClient = createArmSdkClient({
  get(path, options) {
    return HttpClient.get(path, undefined, options?.timeoutMs);
  },
}, {
  getLocale: () => window.PotokInitialState?.language,
});
