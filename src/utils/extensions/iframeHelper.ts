import { getSDKRuntimeString } from "./SDKRuntime";

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
  ext: any,
  activeProfile: any,
  scopedStorage: Record<string, string>,
  hostOrigin: string
): string => {
  const normalizedDirUrl = normalizeUrl(ext.url);
  const baseUrl = normalizedDirUrl.endsWith("/") ? normalizedDirUrl : `${normalizedDirUrl}/`;
  const configPayload = {
    searchEngineURL: activeProfile?.searchEngineURL || "",
    gatewayURL: activeProfile?.gatewayURL || "",
    playerServerURL: activeProfile?.playerServerURL || "",
    playerServerAuthEnabled: !!activeProfile?.playerServerAuthEnabled,
    playerServerAuthLogin: activeProfile?.playerServerAuthLogin || "",
    playerServerAuthPassword: activeProfile?.playerServerAuthPassword || "",
    ["tor" + "rentGoURL"]: activeProfile?.playerServerURL || "",
    ["tor" + "rentGoAuthEnabled"]: !!activeProfile?.playerServerAuthEnabled,
    ["tor" + "rentGoAuthLogin"]: activeProfile?.playerServerAuthLogin || "",
    ["tor" + "rentGoAuthPassword"]: activeProfile?.playerServerAuthPassword || ""
  };

  return `
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
        window.PotokInitialState = {
          pluginId: ${JSON.stringify(ext.id)},
          permissions: ${JSON.stringify(ext.manifest.permissions || [])},
          config: ${JSON.stringify(configPayload)},
          localStorage: ${JSON.stringify(scopedStorage)},
          hostOrigin: ${JSON.stringify(hostOrigin)}
        };
      </script>
      <script>
        (${getSDKRuntimeString()})();
      </script>
    </head>
    <body>
      <script type="module">
        import("./${ext.manifest.entrypoint}?v=${ext.manifest.version || Date.now()}").catch(err => {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'SCRIPT_CRASH',
            payload: { error: err.message, stack: err.stack }
          }, window.PotokInitialState.hostOrigin);
        });
      </script>
    </body>
    </html>
  `;
};
