import type { RegisteredExtension } from "@potok/sdk-types";
import type { ConnectionProfile } from "../../network/ApiTypes";

export interface HttpProxyRequestPayload {
  requestId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
}

export interface PostMessageCapable {
  postMessage(message: unknown, targetOrigin?: string): void;
}

export function asPostMessageSource(source: MessageEventSource | null): PostMessageCapable | null {
  if (!source || !("postMessage" in source) || typeof source.postMessage !== "function") {
    return null;
  }
  return source as PostMessageCapable;
}

export type PluginConfigValue = string | number | boolean | undefined;

export type PluginConfigPayload = Record<string, PluginConfigValue>;

export interface BlockContextPayload {
  tab?: string;
  [key: string]: unknown;
}

export interface PotokSandboxWindow extends Window {
  PotokSandboxTriggerUIEvent?: (callbackId: string, eventData: unknown) => void;
}

export type { RegisteredExtension, ConnectionProfile };