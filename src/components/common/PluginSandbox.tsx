import React, { useEffect, useRef, useState } from "react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import { initPotokSDK } from "../../utils/extensions/SDKRuntime";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { RegisteredExtension } from "../../network/SDKTypes";

export const PluginSandbox: React.FC = () => {
  const { connectionProfiles, activeProfileID, playVideo } = useAppSettings();
  const { show: showHUD } = useHUD();
  const [activeExtensions, setActiveExtensions] = useState<RegisteredExtension[]>([]);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

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
    // Custom event to trigger immediate reload within settings
    window.addEventListener("potok_extensions_updated", syncExtensions);

    return () => {
      window.removeEventListener("storage", syncExtensions);
      window.removeEventListener("potok_extensions_updated", syncExtensions);
    };
  }, []);

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
                "../sdk.js": "data:text/javascript,export const PotokSDK = window.PotokSDK;",
                "./sdk.js": "data:text/javascript,export const PotokSDK = window.PotokSDK;"
              }
            }
          </script>
          <base href="${baseUrl}">
          <script>
            (${initPotokSDK.toString()})();
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

      const blob = new Blob([iframeHtml], { type: "text/html" });
      iframe.src = URL.createObjectURL(blob);
      document.body.appendChild(iframe);

      iframeRefs.current.set(ext.id, iframe);
      ExtensionRegistry.registerSandbox(ext.id, iframe);
    });

    // 2. Tear down iframes for disabled/deleted extensions
    for (const [id, iframe] of iframeRefs.current.entries()) {
      if (!activeEnabled.some((e) => e.id === id)) {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        iframeRefs.current.delete(id);
        ExtensionRegistry.unregisterSandbox(id);
      }
    }
  }, [activeExtensions]);

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

      const { action, payload } = msg;

      switch (action) {
        case "REGISTER_PLUGIN":
          ExtensionRegistry.registerPlugin(pluginId, payload);
          break;

        case "REGISTER_SOURCE":
          ExtensionRegistry.registerSource(pluginId, payload);
          break;

        case "REGISTER_SLOT_CONTRIBUTION":
          ExtensionRegistry.registerSlotContribution(pluginId, payload);
          // Immediately trigger initial slot render request if applicable
          ExtensionRegistry.triggerSlotRender(payload.id, {});
          break;

        case "SLOT_RENDER_RESPONSE":
          ExtensionRegistry.registerSlotRender(payload.slotId, payload);
          break;

        case "SHOW_HUD":
          showHUD(payload.type, payload.message);
          break;

        case "PLAY_VIDEO":
          playVideo(payload);
          break;

        case "LOOKUP_RESPONSE":
          ExtensionRegistry.handleLookupResponse(payload.requestId, payload.results, payload.error);
          break;

        case "STORAGE_GET": {
          const val = localStorage.getItem(`potok_plugin:scoped:${pluginId}:${payload.key}`);
          event.source.postMessage({
            source: "potok-host",
            action: "STORAGE_GET_RESPONSE",
            payload: { requestId: payload.requestId, value: val }
          }, event.origin as any);
          break;
        }

        case "STORAGE_SET": {
          localStorage.setItem(`potok_plugin:scoped:${pluginId}:${payload.key}`, payload.value);
          event.source.postMessage({
            source: "potok-host",
            action: "STORAGE_SET_RESPONSE",
            payload: { requestId: payload.requestId }
          }, event.origin as any);
          break;
        }

        case "HTTP_REQUEST": {
          const { requestId, url, method, headers } = payload;
          try {
            const gatewayURL = activeProfile?.gatewayURL;
            let responseData = "";
            let responseStatus = 200;

            if (gatewayURL) {
              const res = await fetch(`${gatewayURL}/api/v1/proxy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, method, headers })
              });
              responseStatus = res.status;
              responseData = await res.text();
            } else {
              // Direct fetch fallback if no gateway configured
              const res = await fetch(url, { method, headers });
              responseStatus = res.status;
              responseData = await res.text();
            }

            event.source.postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: responseStatus, data: responseData, error: null }
            }, event.origin as any);
          } catch (err: any) {
            event.source.postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: 500, data: "", error: err.message || "HTTP Proxy failed" }
            }, event.origin as any);
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
  }, [activeProfile, showHUD]);

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
