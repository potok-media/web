import type {
  ExtensionPluginMetadata,
  LookupSource,
  SlotContribution,
  UIComponentSchema,
  LookupQuery,
  StreamResult,
  RawStreamPayload,
  StreamSearchQuery,
  ElementMutation
} from "@potok/sdk-types";
import { BlockMutationsManager } from "./mutationsHelper";
import { SettlementManager } from "./settlementHelper";
import { LegacyLookupSearchManager } from "./legacyLookupHelper";
import { SlotManager } from "./slotHelper";
import { logger } from "../logger";
import { CallbackRegistry } from "../../sdk/src/core/registry";
import type { BlockContextPayload, PotokSandboxWindow } from "./extensionHostTypes";

type RegistryListener = () => void;

type SandboxPromiseRecord = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  pluginId: string;
};

class ExtensionRegistryManager {
  private plugins = new Map<string, ExtensionPluginMetadata>();
  private sources = new Map<string, { source: LookupSource; pluginId: string }>();
  private listeners = new Set<RegistryListener>();
  private sandboxIframes = new Map<string, HTMLIFrameElement>();

  // Declarative Stream Sources
  private streamSources = new Map<string, { id: string; name: string; supportedTypes: ('movie' | 'tv')[]; pluginId: string }>();

  // In-flight active promises
  private activePromises = new Map<string, SandboxPromiseRecord>();

  // Sub-managers
  private settlementManager = new SettlementManager(() => this.notify());
  private mutationsManager = new BlockMutationsManager();
  private slotManager = new SlotManager((id) => this.sandboxIframes.get(id), () => this.notify());
  private legacyManager = new LegacyLookupSearchManager(
    () => this.getSources(),
    (id) => this.sources.get(id),
    (pluginId) => this.sandboxIframes.get(pluginId),
    () => this.notify()
  );

  get settlementState() {
    return this.settlementManager.settlementState;
  }

  addListener(listener: RegistryListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: RegistryListener) {
    this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        logger.error("[ExtensionRegistry] Listener error:", err);
      }
    });
  }

  registerSandbox(pluginId: string, iframe: HTMLIFrameElement) {
    this.sandboxIframes.set(pluginId, iframe);
  }

  broadcastBlockContext(blockName: string, context: BlockContextPayload) {
    const activeTab = context?.tab;
    for (const [pluginId, iframe] of this.sandboxIframes.entries()) {
      if (activeTab && pluginId.toLowerCase() !== String(activeTab).toLowerCase()) {
        continue;
      }
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            source: "potok-host",
            action: "BLOCK_CONTEXT_UPDATE",
            payload: { blockName, context }
          },
          "*"
        );
      }
    }
  }

  unregisterSandbox(pluginId: string) {
    this.sandboxIframes.delete(pluginId);
    this.plugins.delete(pluginId);
    
    for (const [sourceId, val] of this.sources.entries()) {
      if (val.pluginId === pluginId) {
        this.sources.delete(sourceId);
      }
    }

    for (const [sourceId, val] of this.streamSources.entries()) {
      if (val.pluginId === pluginId) {
        this.streamSources.delete(sourceId);
      }
    }

    for (const [requestId, record] of this.activePromises.entries()) {
      if (record.pluginId === pluginId) {
        clearTimeout(record.timeoutId);
        this.activePromises.delete(requestId);
        record.reject(new Error("Plugin disabled"));
      }
    }

    this.mutationsManager.clearForPlugin(pluginId);
    this.slotManager.clearForPlugin(pluginId);
    this.legacyManager.clearForPlugin(pluginId);
    this.notify();
  }

  registerPlugin(pluginId: string, metadata: ExtensionPluginMetadata) {
    this.plugins.set(pluginId, metadata);
    this.notify();
  }

  registerSource(pluginId: string, source: LookupSource) {
    this.sources.set(source.id, { source, pluginId });
    this.notify();
  }

  registerSlotContribution(pluginId: string, contribution: SlotContribution) {
    this.slotManager.registerContribution(pluginId, contribution);
  }

  registerSlotRender(slotId: string, render: { label: string; icon?: string; layout: UIComponentSchema }) {
    this.slotManager.registerRender(slotId, render);
  }

  getPlugins(): ExtensionPluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  getSources(): LookupSource[] {
    return Array.from(this.sources.values()).map((s) => s.source);
  }

  getSlotContributions(slotName: string): { contribution: SlotContribution; pluginId: string }[] {
    return this.slotManager.getContributions(slotName);
  }

  getSlotRender(slotId: string) {
    return this.slotManager.getRender(slotId);
  }

  triggerSlotRender(slotId: string, props: Record<string, unknown>) {
    this.slotManager.triggerRender(slotId, props);
  }

  triggerUIEvent(pluginId: string, callbackId: string, eventData: unknown) {
    if (pluginId === "hot-injected-plugin") {
      CallbackRegistry.trigger(callbackId, eventData);
      return;
    }
    const sandboxWindow = window as PotokSandboxWindow;
    if (pluginId === "potok-sandbox-plugin" && sandboxWindow.PotokSandboxTriggerUIEvent) {
      sandboxWindow.PotokSandboxTriggerUIEvent(callbackId, eventData);
      return;
    }
    this.slotManager.triggerUIEvent(pluginId, callbackId, eventData);
  }

  async triggerLookup(query: LookupQuery, timeoutMs = 8000): Promise<StreamResult[]> {
    return this.legacyManager.triggerLookup(query, timeoutMs);
  }

  handleLookupResponse(requestId: string, results: StreamResult[], error: string | null) {
    this.legacyManager.handleLookupResponse(requestId, results, error);
  }

  initSettlementPhase(expectedPlugins: string[]) {
    this.settlementManager.init(expectedPlugins);
  }

  reportPluginReady(pluginId: string) {
    this.settlementManager.reportReady(pluginId);
  }

  completeSettlement() {
    this.settlementManager.complete();
  }

  getIsSettled(): boolean {
    return this.settlementManager.getIsSettled();
  }

  registerBlockMutations(
    pluginId: string,
    blockName: string,
    mutations: ElementMutation[] = [],
    appends: UIComponentSchema[] = [],
    prepends: UIComponentSchema[] = []
  ) {
    this.mutationsManager.register(pluginId, blockName, mutations, appends, prepends);
    this.notify();
  }

  getBlockMutations(blockName: string) {
    return this.mutationsManager.get(blockName);
  }

  registerSearchProvider(pluginId: string, id: string, name: string, icon: string | undefined, callbackId: string) {
    this.legacyManager.registerSearchProvider(pluginId, id, name, icon, callbackId);
  }

  getSearchProviders() {
    return this.legacyManager.getSearchProviders();
  }

  async triggerSearch(query: StreamSearchQuery, timeoutMs = 8000): Promise<RawStreamPayload[]> {
    return this.legacyManager.triggerSearch(query, timeoutMs);
  }

  handleSearchResponse(requestId: string, results: RawStreamPayload[], error: string | null) {
    this.legacyManager.handleSearchResponse(requestId, results, error);
  }

  // --- Declarative Stream Sources ---
  registerStreamSource(pluginId: string, source: { id: string; name: string; supportedTypes: ('movie' | 'tv')[]; capabilities?: { fileOverride?: boolean } }) {
    this.streamSources.set(source.id, { ...source, pluginId });
    this.notify();
  }

  getStreamSources() {
    return Array.from(this.streamSources.values());
  }

  async sendSandboxRequest<T>(
    pluginId: string,
    action: string,
    payload: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<T> {
    const iframe = this.sandboxIframes.get(pluginId);
    const contentWindow = iframe?.contentWindow;
    if (!iframe || !contentWindow) {
      throw new Error(`Plugin sandbox not active: ${pluginId}`);
    }

    const requestId = `${action}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

    let finalTimeoutMs = timeoutMs;
    if (finalTimeoutMs === undefined) {
      if (action === "STREAM_SOURCE_SEARCH") {
        finalTimeoutMs = 60000;
      } else if (action === "STREAM_SOURCE_GET_PLAYBACK_METADATA") {
        // Deferred background probe (subtitles/duration) — the player is already open and playing, so nobody
        // is blocked. Generous host-side safety ceiling for a provider whose metadata probe may be slow to
        // warm up (e.g. a cold container-header read). Any plugin can pass its own timeoutMs to override.
        finalTimeoutMs = 60000;
      } else if (
        action === "STREAM_SOURCE_GET_EPISODES" ||
        action === "STREAM_SOURCE_GET_SEASONS" ||
        action === "STREAM_SOURCE_SAVE_OVERRIDE" ||
        action === "STREAM_SOURCE_CLEAR_OVERRIDE" ||
        action === "STREAM_SOURCE_SAVE_FILE_OVERRIDE" ||
        action === "STREAM_SOURCE_CLEAR_FILE_OVERRIDE" ||
        action === "STREAM_SOURCE_GET_PLAYBACK_INFO"
      ) {
        finalTimeoutMs = 15000;
      } else {
        finalTimeoutMs = 5000;
      }
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.activePromises.delete(requestId);
        reject(new Error(`Request ${action} timed out after ${finalTimeoutMs}ms`));
      }, finalTimeoutMs);

      this.activePromises.set(requestId, {
        resolve: (value) => resolve(value as T),
        reject,
        timeoutId,
        pluginId,
      });

      contentWindow.postMessage(
        {
          source: "potok-host",
          action,
          payload: {
            ...payload,
            requestId,
          },
        },
        "*"
      );
    });
  }

  triggerListeners() {
    this.notify();
  }

  handleSandboxResponse(requestId: string, data: unknown, error: string | null) {
    const record = this.activePromises.get(requestId);
    if (!record) return;

    clearTimeout(record.timeoutId);
    this.activePromises.delete(requestId);

    if (error) {
      record.reject(new Error(error));
    } else {
      record.resolve(data);
    }
  }

  notifySettingsFieldChanged(
    pluginId: string,
    key: string,
    value: unknown,
    currentSettings: Record<string, unknown>,
  ) {
    const iframe = this.sandboxIframes.get(pluginId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        source: "potok-host",
        action: "SETTINGS_FIELD_CHANGED",
        payload: { key, value, settings: currentSettings }
      }, "*");
    }
  }
}

export const ExtensionRegistry = new ExtensionRegistryManager();
