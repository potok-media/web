import type { LookupQuery, LookupSource, StreamResult, RawStreamPayload, StreamSearchQuery } from "@potok/sdk-types";
import { processSearchResults } from "./searchHelpers";
import { logger } from "../logger";

export class LegacyLookupSearchManager {
  private lookupCallbacks = new Map<
    string,
    {
      resolve: (results: StreamResult[]) => void;
      reject: (err: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
      expectedCount: number;
      accumulated: StreamResult[];
      receivedCount: number;
    }
  >();

  private searchCallbacks = new Map<
    string,
    {
      resolve: (results: RawStreamPayload[]) => void;
      reject: (err: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
      expectedCount: number;
      accumulated: RawStreamPayload[];
      receivedCount: number;
    }
  >();

  private searchProviders = new Map<
    string,
    { pluginId: string; id: string; name: string; icon?: string; callbackId: string }
  >();

  private getSources: () => LookupSource[];
  private getSourceItem: (id: string) => { source: LookupSource; pluginId: string } | undefined;
  private getSandboxIframe: (pluginId: string) => HTMLIFrameElement | undefined;
  private notify: () => void;

  constructor(
    getSources: () => LookupSource[],
    getSourceItem: (id: string) => { source: LookupSource; pluginId: string } | undefined,
    getSandboxIframe: (pluginId: string) => HTMLIFrameElement | undefined,
    notify: () => void
  ) {
    this.getSources = getSources;
    this.getSourceItem = getSourceItem;
    this.getSandboxIframe = getSandboxIframe;
    this.notify = notify;
  }

  registerSearchProvider(pluginId: string, id: string, name: string, icon: string | undefined, callbackId: string) {
    this.searchProviders.set(id, { pluginId, id, name, icon, callbackId });
    this.notify();
  }

  getSearchProviders() {
    return Array.from(this.searchProviders.values());
  }

  clearForPlugin(pluginId: string) {
    for (const [id, provider] of this.searchProviders.entries()) {
      if (provider.pluginId === pluginId) {
        this.searchProviders.delete(id);
      }
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
          logger.warn(`[ExtensionRegistry] Lookup request ${requestId} timed out after ${timeoutMs}ms.`);
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

      activeSources.forEach((src) => {
        const item = this.getSourceItem(src.id);
        if (!item) return;

        const iframe = this.getSandboxIframe(item.pluginId);
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
      logger.error(`[ExtensionRegistry] Lookup error in request ${requestId}: ${error}`);
    } else {
      record.accumulated.push(...results);
    }

    record.receivedCount++;
    if (record.receivedCount >= record.expectedCount) {
      this.lookupCallbacks.delete(requestId);
      record.resolve(record.accumulated);
    }
  }

  async triggerSearch(query: StreamSearchQuery, timeoutMs = 8000): Promise<RawStreamPayload[]> {
    const providers = this.getSearchProviders();
    if (providers.length === 0) return [];

    return new Promise<RawStreamPayload[]>((resolve) => {
      const requestId = `search_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      
      const timeoutId = setTimeout(() => {
        const record = this.searchCallbacks.get(requestId);
        if (record) {
          this.searchCallbacks.delete(requestId);
          logger.warn(`[ExtensionRegistry] Search request ${requestId} timed out after ${timeoutMs}ms.`);
          resolve(processSearchResults(record.accumulated));
        }
      }, timeoutMs);

      this.searchCallbacks.set(requestId, {
        resolve: (results) => {
          clearTimeout(timeoutId);
          resolve(processSearchResults(results));
        },
        reject: () => {
          clearTimeout(timeoutId);
          resolve([]);
        },
        timeoutId,
        expectedCount: providers.length,
        accumulated: [],
        receivedCount: 0,
      });

      providers.forEach((prov) => {
        const iframe = this.getSandboxIframe(prov.pluginId);
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              source: "potok-host",
              action: "TRIGGER_SEARCH",
              payload: { callbackId: prov.callbackId, query, requestId }
            },
            "*"
          );
        } else {
          this.handleSearchResponse(requestId, [], `Plugin iframe for ${prov.pluginId} not found`);
        }
      });
    });
  }

  handleSearchResponse(requestId: string, results: RawStreamPayload[], error: string | null) {
    const record = this.searchCallbacks.get(requestId);
    if (!record) return;

    if (error) {
      logger.error(`[ExtensionRegistry] Search error in request ${requestId}: ${error}`);
    } else if (Array.isArray(results)) {
      record.accumulated.push(...results);
    }

    record.receivedCount++;
    if (record.receivedCount >= record.expectedCount) {
      this.searchCallbacks.delete(requestId);
      record.resolve(record.accumulated);
    }
  }
}
