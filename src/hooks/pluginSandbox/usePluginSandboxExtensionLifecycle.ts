import { useCallback, useEffect, useRef, useState } from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { createIframeHtml } from "../../utils/extensions/iframeHelper";
import { i18n } from "../../i18n";
import { computeHostStrings } from "../../utils/extensions/pluginSandbox/pluginSandboxHostStrings";
import { getScopedLocalStorage } from "../../utils/extensions/pluginSandbox/pluginSandboxScopedStorage";
import { loadActiveExtensions } from "../../utils/extensions/pluginSandbox/pluginSandboxMessageBridge";
import { removePluginHostCss } from "../../utils/extensions/pluginSandbox/pluginSandboxHostCss";
import type { ConnectionProfile } from "../../network/ApiTypes";

interface UsePluginSandboxExtensionLifecycleParams {
  activeProfile: ConnectionProfile | null;
}

export function usePluginSandboxExtensionLifecycle({
  activeProfile,
}: UsePluginSandboxExtensionLifecycleParams) {
  const [activeExtensions, setActiveExtensions] = useState<RegisteredExtension[]>([]);
  const [renderedExtensions, setRenderedExtensions] = useState<RegisteredExtension[]>([]);
  const shuttingDownRefs = useRef<Set<string>>(new Set());
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const [iframeSrcDocs, setIframeSrcDocs] = useState<Record<string, string>>({});
  const [settingsVersion, setSettingsVersion] = useState<Record<string, number>>({});

  const triggerPhysicalRemoval = useCallback((pluginId: string) => {
    if (!shuttingDownRefs.current.has(pluginId)) return;
    shuttingDownRefs.current.delete(pluginId);
    iframeRefs.current.delete(pluginId);
    removePluginHostCss(pluginId);
    ExtensionRegistry.unregisterSandbox(pluginId);
    setRenderedExtensions((prev) => prev.filter((e) => e.id !== pluginId));
  }, []);

  const buildIframeSrcDoc = useCallback(
    (ext: RegisteredExtension) =>
      createIframeHtml(
        ext,
        activeProfile,
        getScopedLocalStorage(ext.id),
        window.location.origin,
        i18n.language,
        computeHostStrings(i18n.language),
      ),
    [activeProfile],
  );

  useEffect(() => {
    const syncExtensions = () => setActiveExtensions(loadActiveExtensions());
    syncExtensions();
    window.addEventListener("storage", syncExtensions);
    window.addEventListener("potok_extensions_updated", syncExtensions);
    return () => {
      window.removeEventListener("storage", syncExtensions);
      window.removeEventListener("potok_extensions_updated", syncExtensions);
    };
  }, []);

  useEffect(() => {
    const activeEnabled = activeExtensions.filter((e) => e.enabled);
    const activeIds = new Set(activeEnabled.map((e) => e.id));

    const toShutdown = renderedExtensions.filter(
      (e) => !activeIds.has(e.id) && !shuttingDownRefs.current.has(e.id),
    );

    toShutdown.forEach((ext) => {
      const iframe = iframeRefs.current.get(ext.id);
      if (iframe?.contentWindow) {
        shuttingDownRefs.current.add(ext.id);
        iframe.contentWindow.postMessage(
          { source: "potok-host", action: "PLUGIN_SHUTDOWN", payload: { gracePeriodMs: 800 } },
          "*",
        );
        setTimeout(() => triggerPhysicalRemoval(ext.id), 1000);
      } else {
        triggerPhysicalRemoval(ext.id);
      }
    });

    const nextRendered = [...activeEnabled];
    renderedExtensions.forEach((e) => {
      if (shuttingDownRefs.current.has(e.id)) {
        nextRendered.push(e);
      }
    });

    setIframeSrcDocs((prev) => {
      const next = { ...prev };
      let changed = false;
      activeEnabled.forEach((ext) => {
        if (!next[ext.id]) {
          next[ext.id] = buildIframeSrcDoc(ext);
          changed = true;
        }
      });
      const renderedIds = new Set(nextRendered.map((e) => e.id));
      Object.keys(next).forEach((id) => {
        if (!renderedIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    const currentKeys = renderedExtensions.map((e) => e.id).join(",");
    const nextKeys = nextRendered.map((e) => e.id).join(",");
    if (currentKeys !== nextKeys) {
      setRenderedExtensions(nextRendered);
    }
  }, [activeExtensions, renderedExtensions, buildIframeSrcDoc, triggerPhysicalRemoval]);

  const handleIframeRef = useCallback((extId: string, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(extId, el);
      ExtensionRegistry.registerSandbox(extId, el);
    } else {
      iframeRefs.current.delete(extId);
    }
  }, []);

  return {
    activeExtensions,
    iframeRefs,
    renderedExtensions,
    iframeSrcDocs,
    settingsVersion,
    setSettingsVersion,
    setIframeSrcDocs,
    buildIframeSrcDoc,
    triggerPhysicalRemoval,
    handleIframeRef,
  };
}