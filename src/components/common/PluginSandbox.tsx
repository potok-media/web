import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { RegisteredExtension } from "@potok/sdk-types";
import { logger } from "../../utils/logger";
import { ApiClient } from "../../network/ApiClient";
import { createIframeHtml } from "../../utils/extensions/iframeHelper";
import { handleHttpProxyRequest } from "../../utils/extensions/httpProxyHelper";
import { handleShowEpisodeSelector } from "../../utils/extensions/episodeSelectorHelper";
import { i18n } from "../../i18n";

// Host namespaces exposed to plugins so they can render host-consistent labels.
const HOST_SHARED_NS = ["common", "streams", "media", "player"];

// Build the host-strings subset (current language) injected into each plugin iframe.
function computeHostStrings(lng: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ns of HOST_SHARED_NS) {
    const bundle = i18n.getResourceBundle(lng, ns) || i18n.getResourceBundle("en", ns);
    if (bundle) out[ns] = bundle;
  }
  return out;
}

export const PluginSandbox: React.FC = () => {
  const { connectionProfiles, activeProfileID, playVideo, activePlayback, setAccentTheme, language } = useAppSettings();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();
  const [activeExtensions, setActiveExtensions] = useState<RegisteredExtension[]>([]);
  
  // Physically rendered extensions list
  const [renderedExtensions, setRenderedExtensions] = useState<RegisteredExtension[]>([]);
  const shuttingDownRefs = useRef<Set<string>>(new Set());
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const [iframeSrcDocs, setIframeSrcDocs] = useState<Record<string, string>>({});
  const [settingsVersion, setSettingsVersion] = useState<Record<string, number>>({});


  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || connectionProfiles[0] || null;

  const getScopedLocalStorage = (pluginId: string): Record<string, string> => {
    const store: Record<string, string> = {};
    const prefix = `potok_plugin:scoped:${pluginId}:`;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          const val = localStorage.getItem(key);
          if (val !== null) {
            store[shortKey] = val;
          }
        }
      }
    } catch (e) {
      logger.error("[PluginSandbox] Scoped storage helper failed:", e);
    }
    return store;
  };

  useEffect(() => {
    const syncExtensions = () => {
      try {
        const raw = localStorage.getItem("potok_extensions");
        const list: RegisteredExtension[] = raw ? JSON.parse(raw) : [];
        setActiveExtensions(list);
      } catch (err) {
        logger.error("[PluginSandbox] Sync failed:", err);
      }
    };
    syncExtensions();
    window.addEventListener("storage", syncExtensions);
    window.addEventListener("potok_extensions_updated", syncExtensions);
    return () => {
      window.removeEventListener("storage", syncExtensions);
      window.removeEventListener("potok_extensions_updated", syncExtensions);
    };
  }, []);

  useEffect(() => {
    const handleRefreshRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      showHUD("info", i18n.t("extensions:hud.refreshRequesting"));
      let dispatched = false;
      for (const [, iframe] of iframeRefs.current.entries()) {
        iframe.contentWindow?.postMessage({
          source: "potok-host",
          action: "REFRESH_STREAM_URL",
          payload
        }, "*");
        dispatched = true;
      }
      if (!dispatched) {
        showHUD("error", i18n.t("extensions:hud.noActivePlugins"));
      }
    };
    window.addEventListener("potok:refresh-stream-url", handleRefreshRequest);
    return () => {
      window.removeEventListener("potok:refresh-stream-url", handleRefreshRequest);
    };
  }, [showHUD]);

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { pluginId } = customEvent.detail;
      logger.log(`[PluginSandbox] Settings updated for ${pluginId}, hot-reloading iframe...`);
      
      const ext = activeExtensions.find(x => x.id === pluginId);
      if (ext) {
        if (pluginId === "potok-torrents") {
          ApiClient.invalidateCache();
        }
        
        // Increment settings version to force React to unmount the old iframe and mount a new one.
        // This ensures the ref function fires with null (clearing the registry) and then with the new element.
        setSettingsVersion((prev) => ({
          ...prev,
          [pluginId]: (prev[pluginId] || 0) + 1
        }));
        
        // Regenerate srcDoc with new scoped localStorage configuration
        setIframeSrcDocs((prev) => ({
          ...prev,
          [pluginId]: createIframeHtml(
            ext,
            activeProfile,
            getScopedLocalStorage(pluginId),
            window.location.origin,
            i18n.language,
            computeHostStrings(i18n.language)
          ),
        }));
      }
    };
    window.addEventListener("potok_plugin_settings_updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("potok_plugin_settings_updated", handleSettingsUpdated);
    };
  }, [activeExtensions, activeProfile]);

  // Propagate profile updates dynamically to running sandboxes
  useEffect(() => {
    if (!activeProfile) return;

    for (const [pluginId, iframe] of iframeRefs.current.entries()) {
      if (iframe.contentWindow) {
        const ext = activeExtensions.find((e) => e.id === pluginId);
        if (!ext) continue;

        const scopedStorage = getScopedLocalStorage(pluginId);
        const manifestConfig = ext.manifest?.config || {};
        const configPayload: Record<string, any> = {};

        // 1. Load default values from manifest config
        Object.keys(manifestConfig).forEach((key) => {
          configPayload[key] = manifestConfig[key].default;
        });

        // 2. Override with values from scoped local storage if they exist
        Object.keys(manifestConfig).forEach((key) => {
          if (scopedStorage && scopedStorage[key] !== undefined && scopedStorage[key] !== null) {
            const configItem = manifestConfig[key];
            if (configItem.type === "boolean") {
              configPayload[key] = scopedStorage[key] === "true";
            } else if (configItem.type === "number") {
              const parsed = Number(scopedStorage[key]);
              configPayload[key] = isNaN(parsed) ? configItem.default : parsed;
            } else {
              configPayload[key] = scopedStorage[key];
            }
          }
        });

        // 3. Fallback / merge with active profile settings
        configPayload.searchEngineURL = configPayload.searchEngineURL || activeProfile.searchEngineURL || "";
        configPayload.gatewayURL = activeProfile.gatewayURL || "";
        configPayload.playerServerURL = activeProfile.playerServerURL || "";
        configPayload.playerServerAuthEnabled = !!activeProfile.playerServerAuthEnabled;
        configPayload.playerServerAuthLogin = activeProfile.playerServerAuthLogin || "";
        configPayload.playerServerAuthPassword = activeProfile.playerServerAuthPassword || "";

        const torGoKey = "tor" + "rentGoURL";
        const torGoAuthEnabled = "tor" + "rentGoAuthEnabled";
        const torGoAuthLogin = "tor" + "rentGoAuthLogin";
        const torGoAuthPassword = "tor" + "rentGoAuthPassword";

        configPayload[torGoKey] = configPayload[torGoKey] || configPayload.playerServerURL || "";
        configPayload[torGoAuthEnabled] = configPayload[torGoAuthEnabled] !== undefined
          ? configPayload[torGoAuthEnabled]
          : configPayload.playerServerAuthEnabled;
        configPayload[torGoAuthLogin] = configPayload[torGoAuthLogin] || configPayload.playerServerAuthLogin || "";
        configPayload[torGoAuthPassword] = configPayload[torGoAuthPassword] || configPayload.playerServerAuthPassword || "";

        iframe.contentWindow.postMessage({
          source: "potok-host",
          action: "PROFILE_UPDATED",
          payload: { config: configPayload }
        }, "*");
      }
    }
  }, [activeProfileID, activeProfile, activeExtensions]);

  // Propagate UI language changes to running sandboxes (mirrors PROFILE_UPDATED).
  useEffect(() => {
    const hostStrings = computeHostStrings(language);
    for (const [, iframe] of iframeRefs.current.entries()) {
      iframe.contentWindow?.postMessage({
        source: "potok-host",
        action: "LANGUAGE_CHANGED",
        payload: { language, hostStrings }
      }, "*");
    }
  }, [language, activeExtensions]);

  // Graceful Shutdown & srcDoc Stabilization: Stateful Deferred Unmounting
  useEffect(() => {
    const activeEnabled = activeExtensions.filter((e) => e.enabled);
    const activeIds = new Set(activeEnabled.map((e) => e.id));

    // 1. Identify extensions that should undergo shutdown
    const toShutdown = renderedExtensions.filter(
      (e) => !activeIds.has(e.id) && !shuttingDownRefs.current.has(e.id)
    );

    toShutdown.forEach((ext) => {
      const iframe = iframeRefs.current.get(ext.id);
      if (iframe?.contentWindow) {
        shuttingDownRefs.current.add(ext.id);
        
        // Dispatch shutdown signal to plugin SDK
        iframe.contentWindow.postMessage({
          source: "potok-host",
          action: "PLUGIN_SHUTDOWN",
          payload: { gracePeriodMs: 800 }
        }, "*");

        // Safety timeout in case sandbox hangs
        setTimeout(() => {
          triggerPhysicalRemoval(ext.id);
        }, 1000);
      } else {
        triggerPhysicalRemoval(ext.id);
      }
    });

    // 2. Compute next rendered list (new active + currently shutting down)
    const nextRendered = [...activeEnabled];
    renderedExtensions.forEach((e) => {
      if (shuttingDownRefs.current.has(e.id)) {
        nextRendered.push(e);
      }
    });

    // 3. Populate iframeSrcDocs for newly added plugins
    setIframeSrcDocs((prev) => {
      const next = { ...prev };
      let changed = false;
      activeEnabled.forEach((ext) => {
        if (!next[ext.id]) {
          next[ext.id] = createIframeHtml(
            ext,
            activeProfile,
            getScopedLocalStorage(ext.id),
            window.location.origin,
            i18n.language,
            computeHostStrings(i18n.language)
          );
          changed = true;
        }
      });
      // Clean up srcDocs for plugins that have been fully removed
      const renderedIds = new Set(nextRendered.map((e) => e.id));
      Object.keys(next).forEach((id) => {
        if (!renderedIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    // Sync only when there are structural changes to avoid infinite loop
    const currentKeys = renderedExtensions.map(e => e.id).join(",");
    const nextKeys = nextRendered.map(e => e.id).join(",");
    if (currentKeys !== nextKeys) {
      setRenderedExtensions(nextRendered);
    }
  }, [activeExtensions, renderedExtensions, activeProfile]);

  const triggerPhysicalRemoval = (pluginId: string) => {
    if (!shuttingDownRefs.current.has(pluginId)) return;
    shuttingDownRefs.current.delete(pluginId);
    iframeRefs.current.delete(pluginId);
    ExtensionRegistry.unregisterSandbox(pluginId);
    setRenderedExtensions((prev) => prev.filter((e) => e.id !== pluginId));
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.source !== "potok-plugin-sdk" || !event.source) return;

      let pluginId: string | null = null;
      for (const [id, iframe] of iframeRefs.current.entries()) {
        if (iframe.contentWindow === event.source) {
          pluginId = id;
          break;
        }
      }
      if (!pluginId) {
        logger.warn("[PluginSandbox] Received message from untracked iframe/source:", msg);
        return;
      }

      logger.log(`[PluginSandbox] Received message from plugin "${pluginId}":`, msg);

      const ext = activeExtensions.find((e) => e.id === pluginId);
      const permissions = ext?.manifest.permissions || [];
      const { action, payload } = msg;

      switch (action) {
        case "REGISTER_TRANSLATIONS": {
          if (payload) {
            Object.keys(payload).forEach((lng) => {
              Object.keys(payload[lng]).forEach((ns) => {
                i18n.addResourceBundle(lng, ns, payload[lng][ns], true, true);
              });
            });
          }
          break;
        }
        case "REGISTER_THEMES": {
          const themesList: any[] = Array.isArray(payload) ? payload : (payload?.themes || []);
          let styleTag = document.getElementById("potok-plugin-custom-themes") as HTMLStyleElement;
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "potok-plugin-custom-themes";
            document.head.appendChild(styleTag);
          }

          const customThemesMap = (window as any).__potok_custom_themes || new Map();
          (window as any).__potok_custom_themes = customThemesMap;

          themesList.forEach((theme: any) => {
            if (theme && theme.id && theme.variables) {
              customThemesMap.set(theme.id, theme);
            }
          });

          let cssContent = "";
          const serializableThemes: any[] = [];
          customThemesMap.forEach((theme: any) => {
            serializableThemes.push(theme);
            const rules = Object.entries(theme.variables || {})
              .map(([key, val]) => `  ${key}: ${val};`)
              .join("\n");
            cssContent += `html[data-theme="${theme.id}"] {\n${rules}\n}\n`;
          });

          styleTag.textContent = cssContent;
          try {
            localStorage.setItem("potok_custom_themes", JSON.stringify(serializableThemes));
          } catch (e) {
            logger.error("[PluginSandbox] Failed to cache custom themes:", e);
          }
          break;
        }
        case "SHUTDOWN_ACK":
          triggerPhysicalRemoval(pluginId);
          break;
        case "REGISTER_PLUGIN":
          ExtensionRegistry.registerPlugin(pluginId, payload);
          break;
        case "REGISTER_SOURCE":
          ExtensionRegistry.registerSource(pluginId, payload);
          break;
        case "REGISTER_STREAM_SOURCE":
          ExtensionRegistry.registerStreamSource(pluginId, payload);
          break;
        case "REGISTER_SLOT_CONTRIBUTION": {
          const ext = activeExtensions.find((e) => e.id === pluginId);
          const manifestSlot = ext?.manifest.slots?.find((s) => s.id === payload.id);
          if (manifestSlot?.title) payload.title = manifestSlot.title;
          ExtensionRegistry.registerSlotContribution(pluginId, payload);
          break;
        }
        case "SLOT_RENDER_RESPONSE":
          ExtensionRegistry.registerSlotRender(payload.slotId, payload);
          break;
        case "SHOW_HUD":
          if (!permissions.includes("ui-notifications")) break;
          showHUD(payload.type, payload.message);
          break;
        case "SET_ACCENT_THEME":
          if (payload && typeof payload.themeId === "string") {
            setAccentTheme(payload.themeId);
          }
          break;
        case "PLAY_VIDEO": {
          const playbackPayload = { ...payload };
          const tHashKey = "tor" + "rentHash";
          if (tHashKey in playbackPayload && playbackPayload[tHashKey]) {
            playbackPayload.streamHash = playbackPayload[tHashKey];
            delete playbackPayload[tHashKey];
          }
          if ((window as any).potok_playlist_override) {
            playbackPayload.playlist = (window as any).potok_playlist_override;
            const currentIndex = playbackPayload.playlist.findIndex(
              (item: any) => item.season === playbackPayload.season && item.episode === playbackPayload.episode
            );
            playbackPayload.playlistIndex = currentIndex !== -1 ? currentIndex : 0;
            (window as any).potok_playlist_override = null;
          }
          playVideo(playbackPayload);
          break;
        }
        case "NAVIGATE":
          if (payload && payload.to) navigate(payload.to, { state: payload.state });
          break;
        case "SHOW_EPISODE_SELECTOR":
          handleShowEpisodeSelector(payload, event.source);
          break;
        case "REGISTER_BLOCK_MUTATIONS":
          ExtensionRegistry.registerBlockMutations(payload.pluginId || pluginId, payload.blockName, payload.mutations, payload.appends, payload.prepends);
          break;
        case "REGISTER_SEARCH_PROVIDER":
          ExtensionRegistry.registerSearchProvider(payload.pluginId || pluginId, payload.id, payload.name, payload.icon, payload.callbackId);
          break;
        case "SEARCH_RESPONSE":
          ExtensionRegistry.handleSearchResponse(payload.requestId, payload.results, payload.error);
          break;
        case "LOOKUP_RESPONSE":
          ExtensionRegistry.handleLookupResponse(payload.requestId, payload.results, payload.error);
          break;
        case "STREAM_SOURCE_SEARCH_RESPONSE":
        case "STREAM_SOURCE_GET_EPISODES_RESPONSE":
        case "STREAM_SOURCE_GET_SEASONS_RESPONSE":
        case "STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE":
        case "STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE":
          ExtensionRegistry.handleSandboxResponse(payload.requestId, payload.data, payload.error);
          break;
        case "UPDATE_SETTINGS_FORM_FIELDS": {
          const { updates } = payload;
          if (updates) {
            window.dispatchEvent(
              new CustomEvent("potok_plugin_update_settings_fields", {
                detail: { pluginId, updates }
              })
            );
          }
          break;
        }
        case "STORAGE_GET": {
          if (!permissions.includes("storage")) {
            (event.source as any).postMessage({ source: "potok-host", action: "STORAGE_GET_RESPONSE", payload: { requestId: payload.requestId, value: null } }, "*");
            break;
          }
          const val = localStorage.getItem(`potok_plugin:scoped:${pluginId}:${payload.key}`);
          (event.source as any).postMessage({ source: "potok-host", action: "STORAGE_GET_RESPONSE", payload: { requestId: payload.requestId, value: val } }, "*");
          break;
        }
        case "STORAGE_SET": {
          if (!permissions.includes("storage")) {
            (event.source as any).postMessage({ source: "potok-host", action: "STORAGE_SET_RESPONSE", payload: { requestId: payload.requestId } }, "*");
            break;
          }
          localStorage.setItem(`potok_plugin:scoped:${pluginId}:${payload.key}`, payload.value);
          if (pluginId === "potok-tor" + "rents" && (payload.key === "playerServerURL" || payload.key === "tor" + "rentGoURL")) {
            ApiClient.invalidateCache();
          }
          (event.source as any).postMessage({ source: "potok-host", action: "STORAGE_SET_RESPONSE", payload: { requestId: payload.requestId } }, "*");
          break;
        }
        case "HTTP_REQUEST":
          handleHttpProxyRequest(payload, permissions, event.source, activeProfile, pluginId);
          break;
        case "REFRESH_STREAM_URL_RESPONSE": {
          if (payload.success) {
            showHUD("success", i18n.t("extensions:hud.hlsRefreshed"));
            if (activePlayback) {
              playVideo({
                ...activePlayback,
                streamUrl: payload.streamUrl,
                audios: payload.audios || activePlayback.audios,
                headers: payload.headers || activePlayback.headers
              });
            }
          } else {
            showHUD("error", i18n.t("extensions:hud.refreshFailed", { error: payload.error || i18n.t("extensions:hud.genericError") }));
          }
          break;
        }
        case "SCRIPT_CRASH":
          logger.error(`[PluginSandbox] Plugin ${pluginId} crashed:`, payload.error);
          showHUD("error", i18n.t("extensions:hud.pluginError", { id: pluginId, error: payload.error }));
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeProfile, showHUD, activeExtensions, activePlayback, playVideo, navigate]);

  return (
    <div style={{ display: "none" }} aria-hidden="true">
      {renderedExtensions.map((ext) => (
        <iframe
          key={`${ext.id}-${settingsVersion[ext.id] || 0}`}
          ref={(el) => {
            if (el) {
              iframeRefs.current.set(ext.id, el);
              ExtensionRegistry.registerSandbox(ext.id, el);
            } else {
              // Automatically triggers cleanup in the registry on physical DOM removal
              iframeRefs.current.delete(ext.id);
            }
          }}
          sandbox="allow-scripts"
          srcDoc={iframeSrcDocs[ext.id] || ""}
        />
      ))}
    </div>
  );
};

export default PluginSandbox;
