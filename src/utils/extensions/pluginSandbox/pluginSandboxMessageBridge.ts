import type {
  ElementMutation,
  ExtensionPluginMetadata,
  LookupSource,
  RawStreamPayload,
  RegisteredExtension,
  SlotContribution,
  StreamResult,
  UIComponentSchema,
} from "@potok/sdk-types";
import { i18n } from "../../../i18n";
import { ApiClient } from "../../../network/ApiClient";
import { ExtensionRegistry } from "../ExtensionRegistry";
import { handleHttpProxyRequest } from "../httpProxyHelper";
import { handleShowEpisodeSelector, type ShowEpisodeSelectorPayload } from "../episodeSelectorHelper";
import type { HttpProxyRequestPayload } from "../extensionHostTypes";
import { logger } from "../../logger";
import { registerPluginThemes } from "./pluginSandboxThemes";
import type {
  MessageSource,
  PluginSandboxMessage,
  PluginSandboxMessageContext,
  PluginSandboxWindowBridge,
} from "./pluginSandboxTypes";
import type { ActivePlayback, PlaylistItem } from "../../../context/playbackTypes";

const TORRENT_HASH_KEY = "tor" + "rentHash";
const TORRENT_PLUGIN_ID = "potok-tor" + "rents";
const TORRENT_GO_URL_KEY = "tor" + "rentGoURL";

/** High-frequency sandbox messages — skip settings-console spam. */
const QUIET_PLUGIN_ACTIONS = new Set([
  "SLOT_RENDER_RESPONSE",
  "STORAGE_GET_RESPONSE",
  "STORAGE_SET_RESPONSE",
  "STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE",
]);

function reply(source: MessageSource, action: string, payload: Record<string, unknown>): void {
  const message = { source: "potok-host", action, payload };
  if ("location" in source) {
    source.postMessage(message, "*");
  } else {
    source.postMessage(message);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function nullIfUndefined(error: string | undefined): string | null {
  return error ?? null;
}

export async function handlePluginSandboxMessage(
  ctx: PluginSandboxMessageContext,
  pluginId: string,
  msg: PluginSandboxMessage,
  eventSource: MessageSource,
): Promise<void> {
  const ext = ctx.activeExtensions.find((e) => e.id === pluginId);
  const permissions = ext?.manifest.permissions || [];
  const { action, payload: rawPayload } = msg;
  const payload = asRecord(rawPayload);

  if (!QUIET_PLUGIN_ACTIONS.has(action)) {
    logger.log(`[PluginSandbox] Received message from plugin "${pluginId}":`, msg);
  }

  switch (action) {
    case "REGISTER_TRANSLATIONS": {
      const bundles = rawPayload as Record<string, Record<string, Record<string, unknown>>> | undefined;
      if (bundles) {
        Object.keys(bundles).forEach((lng) => {
          Object.keys(bundles[lng]).forEach((ns) => {
            i18n.addResourceBundle(lng, ns, bundles[lng][ns], true, true);
          });
        });
      }
      break;
    }
    case "REGISTER_THEMES":
      registerPluginThemes(rawPayload);
      break;
    case "SHUTDOWN_ACK":
      ctx.triggerPhysicalRemoval(pluginId);
      break;
    case "REGISTER_PLUGIN":
      ExtensionRegistry.registerPlugin(pluginId, rawPayload as unknown as ExtensionPluginMetadata);
      break;
    case "REGISTER_SOURCE":
      ExtensionRegistry.registerSource(pluginId, rawPayload as unknown as LookupSource);
      break;
    case "REGISTER_STREAM_SOURCE":
      ExtensionRegistry.registerStreamSource(
        pluginId,
        rawPayload as { id: string; name: string; supportedTypes: ("movie" | "tv")[] },
      );
      break;
    case "REGISTER_SLOT_CONTRIBUTION": {
      const slotPayload = { ...payload } as unknown as SlotContribution;
      const manifestSlot = ext?.manifest.slots?.find((s) => s.id === slotPayload.id);
      if (manifestSlot?.title) slotPayload.title = manifestSlot.title;
      ExtensionRegistry.registerSlotContribution(pluginId, slotPayload);
      break;
    }
    case "SLOT_RENDER_RESPONSE":
      ExtensionRegistry.registerSlotRender(String(payload.slotId), {
        label: String(payload.label),
        icon: payload.icon as string | undefined,
        layout: payload.layout as UIComponentSchema,
      });
      break;
    case "SHOW_HUD":
      if (permissions.includes("ui-notifications")) {
        const durationMs = typeof payload.durationMs === "number" ? payload.durationMs : undefined;
        ctx.showHUD(
          payload.type as "success" | "error" | "info" | "warning",
          String(payload.message),
          durationMs,
        );
      }
      break;
    case "SET_ACCENT_THEME":
      if (typeof payload.themeId === "string") {
        ctx.setAccentTheme(payload.themeId);
      }
      break;
    case "PLAY_VIDEO": {
      const playbackPayload = { ...payload } as ActivePlayback & Record<string, unknown>;
      if (TORRENT_HASH_KEY in playbackPayload && playbackPayload[TORRENT_HASH_KEY]) {
        playbackPayload.streamHash = String(playbackPayload[TORRENT_HASH_KEY]);
        delete playbackPayload[TORRENT_HASH_KEY];
      }
      const bridge = window as Window & PluginSandboxWindowBridge;
      if (bridge.potok_playlist_override) {
        playbackPayload.playlist = bridge.potok_playlist_override;
        const playlist = playbackPayload.playlist as PlaylistItem[];
        const currentIndex = playlist.findIndex(
          (item) => item.season === playbackPayload.season && item.episode === playbackPayload.episode,
        );
        playbackPayload.playlistIndex = currentIndex !== -1 ? currentIndex : 0;
        bridge.potok_playlist_override = null;
      }
      ctx.playVideo(playbackPayload);
      break;
    }
    case "NAVIGATE":
      if (payload.to) {
        ctx.navigate(String(payload.to), { state: payload.state });
      }
      break;
    case "SHOW_EPISODE_SELECTOR":
      if (rawPayload && typeof rawPayload === "object") {
        handleShowEpisodeSelector(rawPayload as ShowEpisodeSelectorPayload, eventSource as MessageEventSource);
      }
      break;
    case "REGISTER_BLOCK_MUTATIONS":
      ExtensionRegistry.registerBlockMutations(
        String(payload.pluginId || pluginId),
        String(payload.blockName),
        payload.mutations as ElementMutation[] | undefined,
        payload.appends as UIComponentSchema[] | undefined,
        payload.prepends as UIComponentSchema[] | undefined,
      );
      break;
    case "REGISTER_SEARCH_PROVIDER":
      ExtensionRegistry.registerSearchProvider(
        String(payload.pluginId || pluginId),
        String(payload.id),
        String(payload.name),
        payload.icon as string | undefined,
        String(payload.callbackId),
      );
      break;
    case "SEARCH_RESPONSE":
      ExtensionRegistry.handleSearchResponse(
        String(payload.requestId),
        payload.results as RawStreamPayload[],
        nullIfUndefined(payload.error as string | undefined),
      );
      break;
    case "LOOKUP_RESPONSE":
      ExtensionRegistry.handleLookupResponse(
        String(payload.requestId),
        payload.results as StreamResult[],
        nullIfUndefined(payload.error as string | undefined),
      );
      break;
    case "STREAM_SOURCE_SEARCH_RESPONSE":
    case "STREAM_SOURCE_GET_EPISODES_RESPONSE":
    case "STREAM_SOURCE_GET_SEASONS_RESPONSE":
    case "STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE":
    case "STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE":
    case "STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE":
    case "STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE":
      ExtensionRegistry.handleSandboxResponse(
        String(payload.requestId),
        payload.data,
        nullIfUndefined(payload.error as string | undefined),
      );
      break;
    case "UPDATE_SETTINGS_FORM_FIELDS": {
      const updates = payload.updates;
      if (updates) {
        window.dispatchEvent(
          new CustomEvent("potok_plugin_update_settings_fields", {
            detail: { pluginId, updates },
          }),
        );
      }
      break;
    }
    case "STORAGE_GET": {
      if (!permissions.includes("storage")) {
        reply(eventSource, "STORAGE_GET_RESPONSE", {
          requestId: payload.requestId,
          value: null,
        });
        break;
      }
      const val = localStorage.getItem(`potok_plugin:scoped:${pluginId}:${String(payload.key)}`);
      reply(eventSource, "STORAGE_GET_RESPONSE", {
        requestId: payload.requestId,
        value: val,
      });
      break;
    }
    case "STORAGE_SET": {
      if (!permissions.includes("storage")) {
        reply(eventSource, "STORAGE_SET_RESPONSE", { requestId: payload.requestId });
        break;
      }
      localStorage.setItem(
        `potok_plugin:scoped:${pluginId}:${String(payload.key)}`,
        String(payload.value),
      );
      if (
        pluginId === TORRENT_PLUGIN_ID &&
        (payload.key === "playerServerURL" || payload.key === TORRENT_GO_URL_KEY)
      ) {
        ApiClient.invalidateCache();
      }
      reply(eventSource, "STORAGE_SET_RESPONSE", { requestId: payload.requestId });
      break;
    }
    case "STORAGE_REMOVE": {
      if (!permissions.includes("storage")) break;
      localStorage.removeItem(`potok_plugin:scoped:${pluginId}:${String(payload.key)}`);
      break;
    }
    case "STORAGE_CLEAR": {
      if (!permissions.includes("storage")) break;
      const prefix = `potok_plugin:scoped:${pluginId}:`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) toRemove.push(key);
      }
      toRemove.forEach((key) => localStorage.removeItem(key));
      break;
    }
    case "HTTP_REQUEST":
      if (rawPayload && typeof rawPayload === "object") {
        handleHttpProxyRequest(
          rawPayload as unknown as HttpProxyRequestPayload,
          permissions,
          eventSource as MessageEventSource,
          ctx.activeProfile,
          pluginId,
        );
      }
      break;
    case "REFRESH_STREAM_URL_RESPONSE":
      if (payload.success) {
        ctx.showHUD("success", i18n.t("extensions:hud.hlsRefreshed"));
        if (ctx.activePlayback) {
          ctx.playVideo({
            ...ctx.activePlayback,
            streamUrl: String(payload.streamUrl),
            audios: (payload.audios as ActivePlayback["audios"]) || ctx.activePlayback.audios,
            headers: (payload.headers as ActivePlayback["headers"]) || ctx.activePlayback.headers,
          });
        }
      } else {
        ctx.showHUD(
          "error",
          i18n.t("extensions:hud.refreshFailed", {
            error: String(payload.error || i18n.t("extensions:hud.genericError")),
          }),
        );
      }
      break;
    case "SCRIPT_CRASH":
      logger.error(`[PluginSandbox] Plugin ${pluginId} crashed:`, payload.error);
      ctx.showHUD(
        "error",
        i18n.t("extensions:hud.pluginError", {
          id: pluginId,
          error: String(payload.error),
        }),
      );
      break;
    default:
      break;
  }
}

export function resolvePluginIdFromSource(
  iframeRefs: Map<string, HTMLIFrameElement>,
  source: MessageEventSource | null,
): string | null {
  if (!source) return null;
  for (const [id, iframe] of iframeRefs.entries()) {
    if (iframe.contentWindow === source) {
      return id;
    }
  }
  return null;
}

export function loadActiveExtensions(): RegisteredExtension[] {
  try {
    const raw = localStorage.getItem("potok_extensions");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logger.error("[PluginSandbox] Sync failed:", err);
    return [];
  }
}