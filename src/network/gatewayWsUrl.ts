// Normalize a raw gateway URL (from a profile or a share token) into an absolute SignalR hub URL.
// Mirrors the protocol handling in WebSocketClient.getFullUrl so both hubs resolve URLs identically:
// upgrades ws/wss → http/https, protocol-relative → page protocol, bare host → page protocol, and
// collapses accidental double slashes. `path` must start with "/" (e.g. "/api/watch-together").
export function buildGatewayHubUrl(rawUrl: string, path: string): string {
  let wsUrl = rawUrl.trim().replace(/\/$/, "");
  if (!wsUrl) return "";

  const pageProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "https:" : "http:";

  if (wsUrl.startsWith("//")) {
    wsUrl = `${pageProtocol}//${wsUrl.replace(/^\/+/, "")}`;
  } else if (wsUrl.startsWith("wss://")) {
    wsUrl = wsUrl.replace("wss://", "https://");
  } else if (wsUrl.startsWith("ws://")) {
    wsUrl = wsUrl.replace("ws://", "http://");
  } else if (!wsUrl.startsWith("http://") && !wsUrl.startsWith("https://")) {
    wsUrl = `${pageProtocol}//${wsUrl}`;
  }

  return `${wsUrl}${path}`.replace(/([^:]\/)\/+/g, "$1");
}
