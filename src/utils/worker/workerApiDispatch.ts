import { ApiClient } from "../../network/ApiClient";

export async function dispatchWorkerApiRequest(method: string, args: unknown[]): Promise<unknown> {
  const api = ApiClient as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  const apiMethod = api[method];
  if (typeof apiMethod !== "function") {
    throw new Error(`Method ${method} not found`);
  }
  return apiMethod.apply(ApiClient, args);
}
