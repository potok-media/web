import type { RegisteredExtension } from "@potok/sdk-types";
import type { ConnectionProfile } from "../../../network/ApiTypes";

const TORRENT_GO_URL = "tor" + "rentGoURL";
const TORRENT_GO_AUTH_ENABLED = "tor" + "rentGoAuthEnabled";
const TORRENT_GO_AUTH_LOGIN = "tor" + "rentGoAuthLogin";
const TORRENT_GO_AUTH_PASSWORD = "tor" + "rentGoAuthPassword";

export function buildPluginConfigPayload(
  ext: RegisteredExtension,
  scopedStorage: Record<string, string>,
  activeProfile: ConnectionProfile,
): Record<string, unknown> {
  const manifestConfig = ext.manifest?.config || {};
  const configPayload: Record<string, unknown> = {};

  Object.keys(manifestConfig).forEach((key) => {
    configPayload[key] = manifestConfig[key].default;
  });

  Object.keys(manifestConfig).forEach((key) => {
    if (scopedStorage[key] === undefined || scopedStorage[key] === null) return;
    const configItem = manifestConfig[key];
    if (configItem.type === "boolean") {
      configPayload[key] = scopedStorage[key] === "true";
    } else if (configItem.type === "number") {
      const parsed = Number(scopedStorage[key]);
      configPayload[key] = Number.isNaN(parsed) ? configItem.default : parsed;
    } else {
      configPayload[key] = scopedStorage[key];
    }
  });

  configPayload.searchEngineURL =
    configPayload.searchEngineURL || activeProfile.searchEngineURL || "";
  configPayload.gatewayURL = activeProfile.gatewayURL || "";
  configPayload.playerServerURL = activeProfile.playerServerURL || "";
  configPayload.playerServerAuthEnabled = !!activeProfile.playerServerAuthEnabled;
  configPayload.playerServerAuthLogin = activeProfile.playerServerAuthLogin || "";
  configPayload.playerServerAuthPassword = activeProfile.playerServerAuthPassword || "";

  configPayload[TORRENT_GO_URL] =
    configPayload[TORRENT_GO_URL] || configPayload.playerServerURL || "";
  configPayload[TORRENT_GO_AUTH_ENABLED] =
    configPayload[TORRENT_GO_AUTH_ENABLED] !== undefined
      ? configPayload[TORRENT_GO_AUTH_ENABLED]
      : configPayload.playerServerAuthEnabled;
  configPayload[TORRENT_GO_AUTH_LOGIN] =
    configPayload[TORRENT_GO_AUTH_LOGIN] || configPayload.playerServerAuthLogin || "";
  configPayload[TORRENT_GO_AUTH_PASSWORD] =
    configPayload[TORRENT_GO_AUTH_PASSWORD] || configPayload.playerServerAuthPassword || "";

  return configPayload;
}