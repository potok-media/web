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
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || connectionProfiles[0] || null;

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
        showHUD("error", "Плагин онлайн источников не активен.");
      }
    };
    window.addEventListener("potok:refresh-stream-url", handleRefreshRequest);
    return () => {
      window.removeEventListener("potok:refresh-stream-url", handleRefreshRequest);
    };
  }, [showHUD]);

  useEffect(() => {
    const activeEnabled = activeExtensions.filter((e) => e.enabled);

    activeEnabled.forEach(async (ext) => {
      if (iframeRefs.current.has(ext.id)) return;

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.srcdoc = createIframeHtml(ext, activeProfile);
      document.body.appendChild(iframe);

      iframeRefs.current.set(ext.id, iframe);
      ExtensionRegistry.registerSandbox(ext.id, iframe);
    });

    for (const [id, iframe] of iframeRefs.current.entries()) {
      if (!activeEnabled.some((e) => e.enabled && e.id === id)) {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        iframeRefs.current.delete(id);
        ExtensionRegistry.unregisterSandbox(id);
      }
    }
  }, [activeExtensions, activeProfile]);

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
          handleHttpProxyRequest(payload, permissions, event.source, activeProfile);
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

  useEffect(() => {
    return () => {
      iframeRefs.current.forEach((iframe) => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      });
      iframeRefs.current.clear();
    };
  }, []);

  return null;
};

export default PluginSandbox;
