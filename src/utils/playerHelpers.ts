import { Storage } from "./StorageService";

export const getFileExtension = (url: string): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) {
      return pathname.slice(lastDot + 1).toLowerCase();
    }
  } catch {
    const cleanUrl = url.split("?")[0];
    const lastDot = cleanUrl.lastIndexOf(".");
    if (lastDot !== -1) {
      return cleanUrl.slice(lastDot + 1).toLowerCase();
    }
  }
  return "";
};

export const updateStreamUrlParams = (url: string, params: { remux?: string; start?: string; audio?: string }): string => {
  try {
    const parsed = new URL(url);
    if (params.remux !== undefined) parsed.searchParams.set("remux", params.remux);
    if (params.start !== undefined) parsed.searchParams.set("start", params.start);
    if (params.audio !== undefined) {
      if (params.audio) parsed.searchParams.set("audio", params.audio);
      else parsed.searchParams.delete("audio");
    }
    return parsed.toString();
  } catch {
    const baseUrl = url.split("?")[0];
    const queryParts: string[] = [];
    if (params.remux) queryParts.push(`remux=${params.remux}`);
    if (params.start) queryParts.push(`start=${params.start}`);
    if (params.audio) queryParts.push(`audio=${params.audio}`);
    return queryParts.length > 0 ? `${baseUrl}?${queryParts.join("&")}` : baseUrl;
  }
};

export const normalizeStreamUrlToPath = (url: string): string => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const linkParam = parsed.searchParams.get("link");
    const indexParam = parsed.searchParams.get("index");
    if (linkParam && indexParam) {
      const baseUrl = url.split("/stream/")[0];
      const filename = parsed.pathname.split("/").pop() || "video.mkv";
      return `${baseUrl}/stream/${linkParam.toLowerCase()}/${indexParam}/${filename}`;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return url;
};

export const getHlsStreamUrl = (url: string): string => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const pathMatch = parsed.pathname.match(/\/(?:stream|torrents)\/([a-f0-9]{40})(?:\/files)?\/(\d+)/i);
    if (pathMatch) {
      const hash = pathMatch[1].toLowerCase();
      const fileIndex = pathMatch[2];
      return `${parsed.origin}/api/torrents/${hash}/files/${fileIndex}/hls/master.m3u8`;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return url;
};

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const getProxyUrl = (targetUrl: string, gatewayBase: string, headers?: Record<string, string>) => {
  if (!targetUrl) return targetUrl;
  
  const shouldBypass = Storage.get<boolean>("disableHttpProxy", true);
  if (shouldBypass) {
    return targetUrl;
  }

  const apiTKey = "/api/torrents";
  const apiTKeyLegacy = "/api/torrent";
  if (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1") || targetUrl.includes(apiTKey) || targetUrl.includes(apiTKeyLegacy) || targetUrl.includes("/stream/")) {
    return targetUrl;
  }
  const cleanBase = gatewayBase.replace(/\/+$/, "");
  let proxyUrl = `${cleanBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`;

  if (headers) {
    if (headers["Referer"]) {
      proxyUrl += `&referer=${encodeURIComponent(headers["Referer"])}`;
    }
    if (headers["Origin"]) {
      proxyUrl += `&origin=${encodeURIComponent(headers["Origin"])}`;
    }
  }
  return proxyUrl;
};
