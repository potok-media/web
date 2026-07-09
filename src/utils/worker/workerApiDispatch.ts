import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";

type CallableApi = Record<string, (...args: unknown[]) => Promise<unknown>>;

function asCallableApi(client: object): CallableApi {
  return client as CallableApi;
}

export async function dispatchWorkerApiRequest(method: string, args: unknown[]): Promise<unknown> {
  if (method.startsWith("sync_")) {
    const actualMethod = method.substring(5);
    const api = asCallableApi(SyncApiClient);
    const apiMethod = api[actualMethod];
    if (typeof apiMethod !== "function") {
      throw new Error(`Method ${method} not found`);
    }
    return apiMethod.apply(SyncApiClient, args);
  }

  const api = asCallableApi(ApiClient);
  const apiMethod = api[method];
  if (typeof apiMethod !== "function") {
    throw new Error(`Method ${method} not found`);
  }
  return apiMethod.apply(ApiClient, args);
}