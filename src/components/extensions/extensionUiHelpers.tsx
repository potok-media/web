import {
  Search, Puzzle, Globe, Database, Bell, Play, Sparkles,
} from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";

export const PERMISSION_KEYS: Record<string, string> = {
  "storage": "permissionDescriptions.storage",
  "http-proxy": "permissionDescriptions.httpProxy",
  "ui-notifications": "permissionDescriptions.uiNotifications",
};

export const getExtensionIcon = (manifest: ExtensionManifest) => {
  const name = (manifest.name || "").toLowerCase();
  const perms = manifest.permissions || [];
  if (/player|video|kinopoisk|youtube|media|плеер/.test(name)) return <Play size="1.375rem" />;
  if (/search|find|filter|поиск/.test(name)) return <Search size="1.375rem" />;
  if (perms.includes("http-proxy") || /network|api|torrent|сеть/.test(name)) return <Globe size="1.375rem" />;
  if (perms.includes("storage") || /db|save|cache|база/.test(name)) return <Database size="1.375rem" />;
  if (perms.includes("ui-notifications") || /notify|alert|уведомл/.test(name)) return <Bell size="1.375rem" />;
  if (/theme|style|css|design|тема/.test(name)) return <Sparkles size="1.375rem" />;
  return <Puzzle size="1.375rem" />;
};

export const getSourceLabel = (url: string) => {
  if (url.includes("github")) return "GitHub";
  if (url.includes("jsdelivr.net")) return "jsDelivr";
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return "Localhost";
  return "Web URL";
};