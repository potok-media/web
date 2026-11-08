import { useEffect } from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { ApiClient } from "../../network/ApiClient";
import { logger } from "../../utils/logger";
import { computeHostStrings } from "../../utils/extensions/pluginSandbox/pluginSandboxHostStrings";
import { getScopedLocalStorage } from "../../utils/extensions/pluginSandbox/pluginSandboxScopedStorage";
import { buildPluginConfigPayload } from "../../utils/extensions/pluginSandbox/pluginSandboxProfileConfig";
import { getUserSnapshot, onUserChange } from "../../sdk/src/user";
import type { SDKUserSnapshot } from "../../sdk/src/types";
import type { ConnectionProfile } from "../../network/ApiTypes";

interface UsePluginSandboxHostEffectsParams {
  activeExtensions: RegisteredExtension[];
  activeProfile: ConnectionProfile | null;
  activeProfileID: string | null;
  language: string;
  iframeRefs: React.MutableRefObject<Map<string, HTMLIFrameElement>>;
  buildIframeSrcDoc: (ext: RegisteredExtension) => string;
  setSettingsVersion: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setIframeSrcDocs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function usePluginSandboxHostEffects({
  activeExtensions,
  activeProfile,
  activeProfileID,
  language,
  iframeRefs,
  buildIframeSrcDoc,
  setSettingsVersion,
  setIframeSrcDocs,
}: UsePluginSandboxHostEffectsParams) {
  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const { pluginId } = (e as CustomEvent).detail;
      logger.log(`[PluginSandbox] Settings updated for ${pluginId}, hot-reloading iframe...`);

      const ext = activeExtensions.find((x) => x.id === pluginId);
      if (!ext) return;

      ApiClient.invalidateCache();
      setSettingsVersion((prev) => ({
        ...prev,
        [pluginId]: (prev[pluginId] || 0) + 1,
      }));
      setIframeSrcDocs((prev) => ({
        ...prev,
        [pluginId]: buildIframeSrcDoc(ext),
      }));
    };
    window.addEventListener("potok_plugin_settings_updated", handleSettingsUpdated);
    return () => window.removeEventListener("potok_plugin_settings_updated", handleSettingsUpdated);
  }, [activeExtensions, buildIframeSrcDoc, setSettingsVersion, setIframeSrcDocs]);

  useEffect(() => {
    if (!activeProfile) return;

    for (const [pluginId, iframe] of iframeRefs.current.entries()) {
      const ext = activeExtensions.find((e) => e.id === pluginId);
      if (!ext || !iframe.contentWindow) continue;

      const configPayload = buildPluginConfigPayload(
        ext,
        getScopedLocalStorage(pluginId),
        activeProfile,
      );

      iframe.contentWindow.postMessage(
        { source: "potok-host", action: "PROFILE_UPDATED", payload: { config: configPayload } },
        "*",
      );
    }
  }, [activeProfileID, activeProfile, activeExtensions, iframeRefs]);

  useEffect(() => {
    const hostStrings = computeHostStrings(language);
    for (const [, iframe] of iframeRefs.current.entries()) {
      iframe.contentWindow?.postMessage(
        { source: "potok-host", action: "LANGUAGE_CHANGED", payload: { language, hostStrings } },
        "*",
      );
    }
  }, [language, activeExtensions, iframeRefs]);

  useEffect(() => {
    const broadcast = (user: SDKUserSnapshot) => {
      for (const [, iframe] of iframeRefs.current.entries()) {
        iframe.contentWindow?.postMessage(
          { source: "potok-host", action: "USER_STATE_CHANGED", payload: user },
          "*",
        );
      }
    };
    broadcast(getUserSnapshot());
    return onUserChange(broadcast);
  }, [iframeRefs]);
}