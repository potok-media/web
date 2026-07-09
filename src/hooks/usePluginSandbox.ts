import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../context/AppSettingsContext";
import { useHUD } from "../context/useHUD";
import { logger } from "../utils/logger";
import {
  handlePluginSandboxMessage,
  resolvePluginIdFromSource,
} from "../utils/extensions/pluginSandbox/pluginSandboxMessageBridge";
import type { PluginSandboxMessage } from "../utils/extensions/pluginSandbox/pluginSandboxTypes";
import { usePluginSandboxExtensionLifecycle } from "./pluginSandbox/usePluginSandboxExtensionLifecycle";
import { usePluginSandboxHostEffects } from "./pluginSandbox/usePluginSandboxHostEffects";

export function usePluginSandbox() {
  const {
    connectionProfiles,
    activeProfileID,
    playVideo,
    activePlayback,
    setAccentTheme,
    language,
  } = useAppSettings();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();

  const activeProfile =
    connectionProfiles.find((p) => p.id === activeProfileID) ||
    connectionProfiles[0] ||
    null;

  const lifecycle = usePluginSandboxExtensionLifecycle({ activeProfile });

  usePluginSandboxHostEffects({
    activeExtensions: lifecycle.activeExtensions,
    activeProfile,
    activeProfileID,
    language,
    showHUD,
    iframeRefs: lifecycle.iframeRefs,
    buildIframeSrcDoc: lifecycle.buildIframeSrcDoc,
    setSettingsVersion: lifecycle.setSettingsVersion,
    setIframeSrcDocs: lifecycle.setIframeSrcDocs,
  });

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const msg = event.data as PluginSandboxMessage;
      if (!msg || msg.source !== "potok-plugin-sdk" || !event.source) return;

      const pluginId = resolvePluginIdFromSource(lifecycle.iframeRefs.current, event.source);
      if (!pluginId) {
        logger.warn("[PluginSandbox] Received message from untracked iframe/source:", msg);
        return;
      }

      await handlePluginSandboxMessage(
        {
          activeExtensions: lifecycle.activeExtensions,
          activeProfile,
          activePlayback,
          showHUD,
          playVideo,
          navigate,
          setAccentTheme,
          triggerPhysicalRemoval: lifecycle.triggerPhysicalRemoval,
        },
        pluginId,
        msg,
        event.source,
      );
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    activeProfile,
    showHUD,
    lifecycle.activeExtensions,
    lifecycle.iframeRefs,
    lifecycle.triggerPhysicalRemoval,
    activePlayback,
    playVideo,
    navigate,
    setAccentTheme,
  ]);

  return {
    renderedExtensions: lifecycle.renderedExtensions,
    iframeSrcDocs: lifecycle.iframeSrcDocs,
    settingsVersion: lifecycle.settingsVersion,
    handleIframeRef: lifecycle.handleIframeRef,
  };
}