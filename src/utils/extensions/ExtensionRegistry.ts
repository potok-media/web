import type {
  ExtensionPluginMetadata,
  LookupSource,
  SlotContribution,
  UIComponentSchema,
  LookupQuery,
  StreamResult
} from "../../network/SDKTypes";

type RegistryListener = () => void;

class ExtensionRegistryManager {
  private plugins = new Map<string, ExtensionPluginMetadata>();
  private sources = new Map<string, { source: LookupSource; pluginId: string }>();
  private contributions = new Map<string, { contribution: SlotContribution; pluginId: string }>();
  private slotRenders = new Map<string, { label: string; icon?: string; layout: UIComponentSchema }>();
  private listeners = new Set<RegistryListener>();

  // Parallel lookup callbacks in-flight
  private lookupCallbacks = new Map<
    string,
    {
      resolve: (results: StreamResult[]) => void;
      reject: (err: Error) => void;
      timeoutId: any;
      expectedCount: number;
      accumulated: StreamResult[];
      receivedCount: number;
    }
  >();

  // Track iframes by pluginId to send messages back
  private sandboxIframes = new Map<string, HTMLIFrameElement>();

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
        console.error("[ExtensionRegistry] Listener error:", err);
      }
    });
  }

  registerSandbox(pluginId: string, iframe: HTMLIFrameElement) {
    this.sandboxIframes.set(pluginId, iframe);
  }

  unregisterSandbox(pluginId: string) {
    this.sandboxIframes.delete(pluginId);
    this.plugins.delete(pluginId);
    
    // Clear sources associated with this plugin
    for (const [sourceId, val] of this.sources.entries()) {
      if (val.pluginId === pluginId) {
        this.sources.delete(sourceId);
      }
    }

    // Clear contributions
    for (const [, val] of this.contributions.entries()) {
      if (val.pluginId === pluginId) {
        this.contributions.delete(val.contribution.id);
        this.slotRenders.delete(val.contribution.id);
      }
    }

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
    this.contributions.set(contribution.id, { contribution, pluginId });
    this.notify();
  }

  registerSlotRender(slotId: string, render: { label: string; icon?: string; layout: UIComponentSchema }) {
    this.slotRenders.set(slotId, render);
    this.notify();
  }

  getPlugins(): ExtensionPluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  getSources(): LookupSource[] {
    return Array.from(this.sources.values()).map((s) => s.source);
  }

  getSlotContributions(slotName: string): { contribution: SlotContribution; pluginId: string }[] {
    return Array.from(this.contributions.values()).filter(
      (c) => c.contribution.slotName === slotName
    );
  }

  getSlotRender(slotId: string) {
    return this.slotRenders.get(slotId);
  }

  triggerSlotRender(slotId: string, props: any) {
    const contribution = this.contributions.get(slotId);
    if (!contribution) return;

    const iframe = this.sandboxIframes.get(contribution.pluginId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          source: "potok-host",
          action: "RENDER_SLOT",
          payload: { slotId, props }
        },
        "*"
      );
    }
  }

  triggerUIEvent(pluginId: string, callbackId: string, eventData: any) {
    const iframe = this.sandboxIframes.get(pluginId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          source: "potok-host",
          action: "TRIGGER_UI_EVENT",
          payload: { callbackId, eventData }
        },
        "*"
      );
    }
  }

  async triggerLookup(query: LookupQuery, timeoutMs = 8000): Promise<StreamResult[]> {
    const activeSources = this.getSources();
    if (activeSources.length === 0) return [];

    return new Promise<StreamResult[]>((resolve) => {
      const requestId = `lookup_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      
      const timeoutId = setTimeout(() => {
        const record = this.lookupCallbacks.get(requestId);
        if (record) {
          this.lookupCallbacks.delete(requestId);
          console.warn(`[ExtensionRegistry] Lookup request ${requestId} timed out after ${timeoutMs}ms.`);
          resolve(record.accumulated);
        }
      }, timeoutMs);

      this.lookupCallbacks.set(requestId, {
        resolve: (results) => {
          clearTimeout(timeoutId);
          resolve(results);
        },
        reject: () => {
          clearTimeout(timeoutId);
          resolve([]);
        },
        timeoutId,
        expectedCount: activeSources.length,
        accumulated: [],
        receivedCount: 0,
      });

      // Dispatch to each source
      activeSources.forEach((src) => {
        const item = this.sources.get(src.id);
        if (!item) return;

        const iframe = this.sandboxIframes.get(item.pluginId);
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              source: "potok-host",
              action: "TRIGGER_LOOKUP",
              payload: { sourceId: src.id, query, requestId }
            },
            "*"
          );
        }
      });
    });
  }

  handleLookupResponse(requestId: string, results: StreamResult[], error: string | null) {
    const record = this.lookupCallbacks.get(requestId);
    if (!record) return;

    if (error) {
      console.error(`[ExtensionRegistry] Lookup error in request ${requestId}:`, error);
    } else {
      record.accumulated.push(...results);
    }

    record.receivedCount++;
    if (record.receivedCount >= record.expectedCount) {
      this.lookupCallbacks.delete(requestId);
      record.resolve(record.accumulated);
    }
  }
}

export const ExtensionRegistry = new ExtensionRegistryManager();
