import { initPotokSDK } from "./SDKRuntime";

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

export const createIframeHtml = (ext: any, activeProfile: any): string => {
  const normalizedDirUrl = normalizeUrl(ext.url);
  const baseUrl = normalizedDirUrl.endsWith("/") ? normalizedDirUrl : `${normalizedDirUrl}/`;

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
        (${initPotokSDK.toString()})(
          ${JSON.stringify(ext.id)},
          ${JSON.stringify(ext.manifest.permissions || [])},
          ${JSON.stringify({
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
};
