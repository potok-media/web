import potokSdkRaw from "../../../public/sdk/potok-sdk.js?raw";
import { Storage } from "../StorageService";
import type { PluginConfigPayload, RegisteredExtension, ConnectionProfile } from "./extensionHostTypes";

export const normalizeUrl = (url: string): string => {
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

export const createIframeHtml = (
  ext: RegisteredExtension,
  activeProfile: ConnectionProfile | null,
  scopedStorage: Record<string, string>,
  hostOrigin: string,
  language?: string,
  hostStrings?: Record<string, unknown>,
): string => {
  const normalizedDirUrl = normalizeUrl(ext.url);
  const baseUrl = normalizedDirUrl.endsWith("/") ? normalizedDirUrl : `${normalizedDirUrl}/`;
  const manifestConfig = ext.manifest?.config || {};
  const configPayload: PluginConfigPayload = {};

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
  configPayload.searchEngineURL = configPayload.searchEngineURL || activeProfile?.searchEngineURL || "";
  configPayload.gatewayURL = activeProfile?.gatewayURL || "";
  configPayload.playerServerURL = activeProfile?.playerServerURL || "";
  configPayload.playerServerAuthEnabled = !!activeProfile?.playerServerAuthEnabled;
  configPayload.playerServerAuthLogin = activeProfile?.playerServerAuthLogin || "";
  configPayload.playerServerAuthPassword = activeProfile?.playerServerAuthPassword || "";
  configPayload.disableHttpProxy = Storage.get<boolean>("disableHttpProxy", true);

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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <base href="${baseUrl}">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
      <script>
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
      </script>
      <script>
        window.PotokInitialState = {
          pluginId: ${JSON.stringify(ext.id)},
          permissions: ${JSON.stringify(ext.manifest.permissions || [])},
          config: ${JSON.stringify(configPayload)},
          localStorage: ${JSON.stringify(scopedStorage)},
          hostOrigin: ${JSON.stringify(hostOrigin)},
          language: ${JSON.stringify(language || "en")},
          hostStrings: ${JSON.stringify(hostStrings || {})}
        };
      </script>
      <script>
        ${potokSdkRaw}
      </script>
    </head>
    <body>
      <script>
        // Fetch the plugin compiled into one IIFE by the gateway bundler and run it.
        // Replaces native ESM import(): same single bundle format the native client uses.
        (async function () {
          try {
            const cfg = window.PotokInitialState.config || {};
            const gateway = String(cfg.gatewayURL || "").replace(/\\/+$/, "");
            if (!gateway) throw new Error("gatewayURL not configured for plugin bundling");
            const entry = new URL("./${ext.manifest.entrypoint}", document.baseURI).href;
            const res = await fetch(gateway + "/api/plugins/bundle?entry=" + encodeURIComponent(entry));
            if (!res.ok) throw new Error("bundle HTTP " + res.status);
            const code = await res.text();
            // ESM module (may use top-level await) → load via blob + dynamic import, not eval.
            const blobUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
            try { await import(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
          } catch (err) {
            window.parent.postMessage({
              source: 'potok-plugin-sdk',
              action: 'SCRIPT_CRASH',
              payload: { error: err.message, stack: err.stack }
            }, window.PotokInitialState.hostOrigin);
          }
        })();
      </script>
    </body>
    </html>
  `;
};
