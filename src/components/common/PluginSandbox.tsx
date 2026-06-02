import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { RegisteredExtension } from "../../network/SDKTypes";
import { logger } from "../../utils/logger";
import { ApiClient } from "../../network/ApiClient";
import { createIframeHtml } from "../../utils/extensions/iframeHelper";
import { handleHttpProxyRequest } from "../../utils/extensions/httpProxyHelper";
import { handleShowEpisodeSelector } from "../../utils/extensions/episodeSelectorHelper";

export const PluginSandbox: React.FC = () => {
  const { connectionProfiles, activeProfileID, playVideo, activePlayback } = useAppSettings();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();
  const [activeExtensions, setActiveExtensions] = useState<RegisteredExtension[]>([]);
  
  // Physically rendered extensions list
  const [renderedExtensions, setRenderedExtensions] = useState<RegisteredExtension[]>([]);
  const shuttingDownRefs = useRef<Set<string>>(new Set());
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const [iframeSrcDocs, setIframeSrcDocs] = useState<Record<string, string>>({});
  const [iframeSrcs, setIframeSrcs] = useState<Record<string, string>>({});

  useEffect(() => {
    const newSrcs: Record<string, string> = {};
    Object.entries(iframeSrcDocs).forEach(([id, html]) => {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      newSrcs[id] = url;
    });

    setIframeSrcs((prev) => {
      Object.values(prev).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          logger.error("[PluginSandbox] Revoking old URL failed:", e);
        }
      });
      return newSrcs;
    });

    return () => {
      Object.values(newSrcs).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          logger.error("[PluginSandbox] Cleanup revoke failed:", e);
        }
      });
    };
  }, [iframeSrcDocs]);

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
      showHUD("info", "Запрос на обновление ссылки...");
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
        showHUD("error", "Нет активных плагинов для обновления ссылки.");
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
        
        // Force unregister and clear previous sandbox info in ExtensionRegistry
        ExtensionRegistry.unregisterSandbox(pluginId);
        
        // Regenerate srcDoc with new scoped localStorage configuration
        setIframeSrcDocs((prev) => ({
          ...prev,
          [pluginId]: createIframeHtml(
            ext,
            activeProfile,
            getScopedLocalStorage(pluginId),
            window.location.origin
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
    const configPayload = {
      searchEngineURL: activeProfile.searchEngineURL || "",
      gatewayURL: activeProfile.gatewayURL || "",
      playerServerURL: activeProfile.playerServerURL || "",
      playerServerAuthEnabled: !!activeProfile.playerServerAuthEnabled,
      playerServerAuthLogin: activeProfile.playerServerAuthLogin || "",
      playerServerAuthPassword: activeProfile.playerServerAuthPassword || "",
      ["tor" + "rentGoURL"]: activeProfile.playerServerURL || "",
      ["tor" + "rentGoAuthEnabled"]: !!activeProfile.playerServerAuthEnabled,
      ["tor" + "rentGoAuthLogin"]: activeProfile.playerServerAuthLogin || "",
      ["tor" + "rentGoAuthPassword"]: activeProfile.playerServerAuthPassword || ""
    };

    for (const [, iframe] of iframeRefs.current.entries()) {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          source: "potok-host",
          action: "PROFILE_UPDATED",
          payload: { config: configPayload }
        }, "*");
      }
    }
  }, [activeProfileID]);

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
            window.location.origin
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
      if (!pluginId) return;

      const ext = activeExtensions.find((e) => e.id === pluginId);
      const permissions = ext?.manifest.permissions || [];
      const { action, payload } = msg;

      switch (action) {
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
            showHUD("success", "Ссылка на HLS поток обновлена!");
            if (activePlayback) {
              playVideo({
                ...activePlayback,
                streamUrl: payload.streamUrl,
                audios: payload.audios || activePlayback.audios,
                headers: payload.headers || activePlayback.headers
              });
            }
          } else {
            showHUD("error", `Не удалось обновить поток: ${payload.error || "ошибка"}`);
          }
          break;
        }
        case "SCRIPT_CRASH":
          logger.error(`[PluginSandbox] Plugin ${pluginId} crashed:`, payload.error);
          showHUD("error", `Плагин "${pluginId}" вызвал ошибку: ${payload.error}`);
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
          key={ext.id}
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
          src={iframeSrcs[ext.id] || ""}
        />
      ))}
    </div>
  );
};

export default PluginSandbox;
