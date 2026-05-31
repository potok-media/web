import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import { initPotokSDK } from "../../utils/extensions/SDKRuntime";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { RegisteredExtension } from "../../network/SDKTypes";
import { logger } from "../../utils/logger";
import { ApiClient } from "../../network/ApiClient";

export const PluginSandbox: React.FC = () => {
  const { connectionProfiles, activeProfileID, playVideo, activePlayback } = useAppSettings();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();
  const [activeExtensions, setActiveExtensions] = useState<RegisteredExtension[]>([]);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || connectionProfiles[0] || null;

  // Sync active extensions from localStorage periodically/initially
  useEffect(() => {
    const syncExtensions = () => {
      try {
        const raw = localStorage.getItem("potok_extensions");
        const list: RegisteredExtension[] = raw ? JSON.parse(raw) : [];
        setActiveExtensions(list);
      } catch (err) {
        console.error("[PluginSandbox] Sync failed:", err);
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

  // Listen for stream refresh requests from the player
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

  // Helper to translate direct GitHub raw links to jsDelivr CDN links to solve MIME type restrictions
  const normalizeUrl = (url: string): string => {
    let clean = url.trim();
    if (clean.includes("raw.githubusercontent.com")) {
      const match = clean.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
      if (match) {
        const [, user, repo, branch, path] = match;
        clean = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
      }
    }
    return clean;
  };

  useEffect(() => {
    const activeEnabled = activeExtensions.filter((e) => e.enabled);

    // 1. Mount new iframes for newly enabled extensions
    activeEnabled.forEach(async (ext) => {
      if (iframeRefs.current.has(ext.id)) return;

      const normalizedDirUrl = normalizeUrl(ext.url);
      const baseUrl = normalizedDirUrl.endsWith("/") ? normalizedDirUrl : `${normalizedDirUrl}/`;

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("sandbox", "allow-scripts");

      const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script type="importmap">
            {
              "imports": {
                "potok-sdk": "data:text/javascript,export const PotokSDK = window.PotokSDK;",
                "@potok/sdk": "data:text/javascript,export const PotokSDK = window.PotokSDK;",
                "../sdk.js": "data:text/javascript,export const PotokSDK = window.PotokSDK;",
                "./sdk.js": "data:text/javascript,export const PotokSDK = window.PotokSDK;"
              }
            }
          </script>
          <base href="${baseUrl}">
          <script>
            (${initPotokSDK.toString()})(
              ${JSON.stringify(ext.id)},
              ${JSON.stringify(ext.manifest.permissions || [])},
              ${JSON.stringify({
                searchEngineURL: activeProfile?.searchEngineURL || "",
                gatewayURL: activeProfile?.gatewayURL || "",
                torrentGoURL: activeProfile?.torrentGoURL || "",
                torrentGoAuthEnabled: !!activeProfile?.torrentGoAuthEnabled,
                torrentGoAuthLogin: activeProfile?.torrentGoAuthLogin || "",
                torrentGoAuthPassword: activeProfile?.torrentGoAuthPassword || ""
              })}
            );
          </script>
        </head>
        <body>
          <script type="module">
            import("./${ext.manifest.entrypoint}").catch(err => {
              window.parent.postMessage({
                source: 'potok-plugin-sdk',
                action: 'SCRIPT_CRASH',
                payload: { error: err.message, stack: err.stack }
              }, '*');
            });
          </script>
        </body>
        </html>
      `;

      iframe.srcdoc = iframeHtml;
      document.body.appendChild(iframe);

      iframeRefs.current.set(ext.id, iframe);
      ExtensionRegistry.registerSandbox(ext.id, iframe);
    });

    // 2. Tear down iframes for disabled/deleted extensions
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

  // Handle postMessage messages securely
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.source !== "potok-plugin-sdk" || !event.source) return;

      // Identify the pluginId by searching which iframe sent it (prevents spoofing)
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

        case "REGISTER_SLOT_CONTRIBUTION": {
          const ext = activeExtensions.find((e) => e.id === pluginId);
          const manifestSlot = ext?.manifest.slots?.find((s) => s.id === payload.id);
          if (manifestSlot?.title) {
            payload.title = manifestSlot.title;
          }
          ExtensionRegistry.registerSlotContribution(pluginId, payload);
          break;
        }

        case "SLOT_RENDER_RESPONSE":
          ExtensionRegistry.registerSlotRender(payload.slotId, payload);
          break;

        case "SHOW_HUD":
          if (!permissions.includes("ui-notifications")) {
            console.warn(`[PluginSandbox] Plugin "${pluginId}" requested SHOW_HUD without "ui-notifications" permission.`);
            break;
          }
          showHUD(payload.type, payload.message);
          break;

        case "PLAY_VIDEO": {
          playVideo(payload);
          break;
        }

        case "NAVIGATE":
          if (payload && payload.to) {
            navigate(payload.to, { state: payload.state });
          }
          break;



        case "SHOW_EPISODE_SELECTOR": {
          const detail: any = {};
          if (payload.title !== undefined) detail.title = payload.title;
          if (payload.episodes !== undefined) detail.episodes = payload.episodes;
          if (payload.seasons !== undefined) detail.seasons = payload.seasons;
          if (payload.seasonsLoading !== undefined) detail.seasonsLoading = payload.seasonsLoading;
          if (payload.isSaving !== undefined) detail.isSaving = payload.isSaving;
          if (payload.tmdbSeasonsCount !== undefined) detail.tmdbSeasonsCount = payload.tmdbSeasonsCount;

          if (payload.onPlayCallbackId) {
            detail.onPlay = (episode: any, audioId: string) => {
              (event.source as any).postMessage({
                source: "potok-host",
                action: "TRIGGER_UI_EVENT",
                payload: {
                  callbackId: payload.onPlayCallbackId,
                  eventData: { episode, audioId }
                }
              }, "*");
            };
          }

          if (payload.onStartEditingCallbackId) {
            detail.onStartEditing = () => {
              (event.source as any).postMessage({
                source: "potok-host",
                action: "TRIGGER_UI_EVENT",
                payload: {
                  callbackId: payload.onStartEditingCallbackId,
                  eventData: {}
                }
              }, "*");
            };
          }

          if (payload.onApplyOverrideCallbackId) {
            detail.onApplyOverride = (seasonNum: number, epNum: number) => {
              (event.source as any).postMessage({
                source: "potok-host",
                action: "TRIGGER_UI_EVENT",
                payload: {
                  callbackId: payload.onApplyOverrideCallbackId,
                  eventData: { seasonNum, epNum }
                }
              }, "*");
            };
          }

          window.dispatchEvent(new CustomEvent("potok:show-episode-selector", { detail }));
          break;
        }

        case "REGISTER_BLOCK_MUTATIONS": {
          const { pluginId: payloadPluginId, blockName, mutations, appends, prepends } = payload;
          ExtensionRegistry.registerBlockMutations(payloadPluginId || pluginId, blockName, mutations, appends, prepends);
          break;
        }

        case "REGISTER_SEARCH_PROVIDER": {
          const { pluginId: payloadPluginId, id, name, icon, callbackId } = payload;
          ExtensionRegistry.registerSearchProvider(payloadPluginId || pluginId, id, name, icon, callbackId);
          break;
        }

        case "SEARCH_RESPONSE":
          ExtensionRegistry.handleSearchResponse(payload.requestId, payload.results, payload.error);
          break;

        case "LOOKUP_RESPONSE":
          ExtensionRegistry.handleLookupResponse(payload.requestId, payload.results, payload.error);
          break;

        case "STORAGE_GET": {
          if (!permissions.includes("storage")) {
            logger.warn(`[PluginSandbox] Permission "storage" is missing for plugin ${pluginId}`);
            (event.source as any).postMessage({
              source: "potok-host",
              action: "STORAGE_GET_RESPONSE",
              payload: { requestId: payload.requestId, value: null }
            }, "*");
            break;
          }
          const val = localStorage.getItem(`potok_plugin:scoped:${pluginId}:${payload.key}`);
          // CRITICAL: We use "*" instead of event.origin here because blob URL origins can be "null" 
          // inside sandboxed frames, which would block postMessage callbacks from being delivered.
          (event.source as any).postMessage({
            source: "potok-host",
            action: "STORAGE_GET_RESPONSE",
            payload: { requestId: payload.requestId, value: val }
          }, "*");
          break;
        }

        case "STORAGE_SET": {
          if (!permissions.includes("storage")) {
            logger.warn(`[PluginSandbox] Permission "storage" is missing for plugin ${pluginId}`);
            (event.source as any).postMessage({
              source: "potok-host",
              action: "STORAGE_SET_RESPONSE",
              payload: { requestId: payload.requestId }
            }, "*");
            break;
          }
          localStorage.setItem(`potok_plugin:scoped:${pluginId}:${payload.key}`, payload.value);
          if (pluginId === "potok-torrents" && payload.key === "torrentGoURL") {
            ApiClient.invalidateCache();
          }
          (event.source as any).postMessage({
            source: "potok-host",
            action: "STORAGE_SET_RESPONSE",
            payload: { requestId: payload.requestId }
          }, "*");
          break;
        }

        case "HTTP_REQUEST": {
          const { requestId, url, method, headers, body } = payload;
          if (!permissions.includes("http-proxy")) {
            (event.source as any).postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: 403, data: "", error: "Отсутствует разрешение http-proxy в манифесте плагина" }
            }, "*");
            break;
          }
          try {
            let finalUrl = url;
            if (url.startsWith("/api/")) {
              const gatewayBase = activeProfile?.gatewayURL 
                ? (activeProfile.gatewayURL.endsWith("/") ? activeProfile.gatewayURL.slice(0, -1) : activeProfile.gatewayURL)
                : "";
              
              // Ensure we prepend protocol if missing
              let absoluteGateway = gatewayBase;
              if (absoluteGateway && !/^https?:\/\//i.test(absoluteGateway)) {
                absoluteGateway = `http://${absoluteGateway}`;
              }
              
              finalUrl = `${absoluteGateway}${url}`;
              console.log(`[PluginSandbox] Rewrote relative API url: ${url} -> ${finalUrl}`);
            }

            const fetchOptions: RequestInit = { method, headers };
            if (body) {
              fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
              if (!headers || !headers["Content-Type"]) {
                fetchOptions.headers = {
                  ...headers,
                  "Content-Type": "application/json"
                };
              }
            }

            const res = await fetch(finalUrl, fetchOptions);
            const responseStatus = res.status;
            const responseData = await res.text();

            (event.source as any).postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: responseStatus, data: responseData, error: null }
            }, "*");
          } catch (err: any) {
            (event.source as any).postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: 500, data: "", error: err.message || "HTTP request failed" }
            }, "*");
          }
          break;
        }

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
          console.error(`[PluginSandbox] Plugin ${pluginId} crashed:`, payload.error, payload.stack);
          showHUD("error", `Плагин "${pluginId}" вызвал ошибку: ${payload.error}`);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeProfile, showHUD, activeExtensions, activePlayback, playVideo]);

  // Clean up all iframe DOM nodes on unmount
  useEffect(() => {
    return () => {
      iframeRefs.current.forEach((iframe) => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      });
      iframeRefs.current.clear();
    };
  }, []);

  return null;
};
export default PluginSandbox;
