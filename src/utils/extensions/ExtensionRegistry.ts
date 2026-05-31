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
} from "../../network/SDKTypes";

type RegistryListener = () => void;

class ExtensionRegistryManager {
  private plugins = new Map<string, ExtensionPluginMetadata>();
  private sources = new Map<string, { source: LookupSource; pluginId: string }>();
  private contributions = new Map<string, { contribution: SlotContribution; pluginId: string }>();
  private slotRenders = new Map<string, { label: string; icon?: string; layout: UIComponentSchema }>();
  private listeners = new Set<RegistryListener>();

  // Boot-Settlement Buffer state
  settlementState: 'idle' | 'settling' | 'settled' = 'idle';
  private expectedPlugins = new Set<string>();
  private settlementTimeoutId: any = null;

  // Block Mutations Store
  private blockMutations = new Map<
    string,
    Map<string, { mutations: ElementMutation[]; appends: UIComponentSchema[]; prepends: UIComponentSchema[] }>
  >();

  // Pure Data Search Providers Store
  private searchProviders = new Map<
    string,
    { pluginId: string; id: string; name: string; icon?: string; callbackId: string }
  >();

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

  // Parallel search callbacks in-flight
  private searchCallbacks = new Map<
    string,
    {
      resolve: (results: RawStreamPayload[]) => void;
      reject: (err: Error) => void;
      timeoutId: any;
      expectedCount: number;
      accumulated: RawStreamPayload[];
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

  broadcastBlockContext(blockName: string, context: any) {
    for (const [, iframe] of this.sandboxIframes.entries()) {
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

    // Clear block mutations
    for (const [blockName, map] of this.blockMutations.entries()) {
      if (map.has(pluginId)) {
        map.delete(pluginId);
        if (map.size === 0) {
          this.blockMutations.delete(blockName);
        }
      }
    }

    // Clear search providers
    for (const [id, provider] of this.searchProviders.entries()) {
      if (provider.pluginId === pluginId) {
        this.searchProviders.delete(id);
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

  // --- Boot-Settlement Buffer ---
  initSettlementPhase(expectedPlugins: string[]) {
    if (this.settlementState !== 'idle') return;
    this.settlementState = 'settling';
    this.expectedPlugins = new Set(expectedPlugins);
    
    if (expectedPlugins.length === 0) {
      this.completeSettlement();
      return;
    }

    this.settlementTimeoutId = setTimeout(() => {
      console.warn("[ExtensionRegistry] Settlement safety timeout reached. Forcing complete.");
      this.completeSettlement();
    }, 1000);
    this.notify();
  }

  reportPluginReady(pluginId: string) {
    if (this.settlementState !== 'settling') return;
    this.expectedPlugins.delete(pluginId);
    if (this.expectedPlugins.size === 0) {
      this.completeSettlement();
    }
  }

  completeSettlement() {
    if (this.settlementState === 'settled') return;
    this.settlementState = 'settled';
    if (this.settlementTimeoutId) {
      clearTimeout(this.settlementTimeoutId);
      this.settlementTimeoutId = null;
    }
    this.notify();
  }

  getIsSettled(): boolean {
    return this.settlementState === 'settled';
  }

  // --- Block Mutations Store ---
  registerBlockMutations(
    pluginId: string,
    blockName: string,
    mutations: ElementMutation[] = [],
    appends: UIComponentSchema[] = [],
    prepends: UIComponentSchema[] = []
  ) {
    if (!this.blockMutations.has(blockName)) {
      this.blockMutations.set(blockName, new Map());
    }
    this.blockMutations.get(blockName)!.set(pluginId, { mutations, appends, prepends });
    this.notify();
  }

  getBlockMutations(blockName: string) {
    const forBlock = this.blockMutations.get(blockName);
    if (!forBlock) return [];
    return Array.from(forBlock.entries()).map(([pluginId, val]) => ({
      pluginId,
      ...val
    }));
  }

  // --- Pure Data Search Providers Store & Dispatcher ---
  registerSearchProvider(pluginId: string, id: string, name: string, icon: string | undefined, callbackId: string) {
    this.searchProviders.set(id, { pluginId, id, name, icon, callbackId });
    this.notify();
  }

  getSearchProviders() {
    return Array.from(this.searchProviders.values());
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
          console.warn(`[ExtensionRegistry] Search request ${requestId} timed out after ${timeoutMs}ms.`);
          resolve(this.processSearchResults(record.accumulated));
        }
      }, timeoutMs);

      this.searchCallbacks.set(requestId, {
        resolve: (results) => {
          clearTimeout(timeoutId);
          resolve(this.processSearchResults(results));
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

      // Dispatch to each provider
      providers.forEach((prov) => {
        const iframe = this.sandboxIframes.get(prov.pluginId);
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
          // If the iframe isn't found/ready, fail it immediately to avoid hanging the promise
          this.handleSearchResponse(requestId, [], `Plugin iframe for ${prov.pluginId} not found`);
        }
      });
    });
  }

  handleSearchResponse(requestId: string, results: RawStreamPayload[], error: string | null) {
    const record = this.searchCallbacks.get(requestId);
    if (!record) return;

    if (error) {
      console.error(`[ExtensionRegistry] Search error in request ${requestId}:`, error);
    } else if (Array.isArray(results)) {
      record.accumulated.push(...results);
    }

    record.receivedCount++;
    if (record.receivedCount >= record.expectedCount) {
      this.searchCallbacks.delete(requestId);
      record.resolve(record.accumulated);
    }
  }

  private processSearchResults(results: RawStreamPayload[]): RawStreamPayload[] {
    const seenHashes = new Set<string>();
    const seenUrls = new Set<string>();
    const seenSizeAndUrl = new Set<string>();
    
    const uniqueResults: RawStreamPayload[] = [];
    
    const getInfoHash = (item: RawStreamPayload): string | null => {
      if (item.hash) return item.hash.toLowerCase();
      if (item.magnet) {
        const match = item.magnet.match(/btih:([a-fA-F0-9]{32,40})/);
        if (match) return match[1].toLowerCase();
      }
      return null;
    };

    const getStreamUrl = (item: RawStreamPayload): string | null => {
      return item.url || null;
    };

    for (const item of results) {
      if (!item) continue;
      
      // Deduplicate by hash
      const hash = getInfoHash(item);
      if (hash) {
        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);
      }
      
      // Deduplicate by URL
      const url = getStreamUrl(item);
      if (url) {
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
      }
      
      // Deduplicate by size and URL or just general same size/url combo
      const sizeStr = item.size !== undefined ? String(item.size) : "";
      if (sizeStr || url) {
        const key = `${sizeStr}_${url || ''}`;
        if (key !== "_" && seenSizeAndUrl.has(key)) {
          continue;
        }
        seenSizeAndUrl.add(key);
      }
      
      uniqueResults.push(item);
    }

    const getQualityScore = (quality?: string): number => {
      if (!quality) return 0;
      const q = quality.toLowerCase();
      if (q.includes("2160") || q.includes("4k") || q.includes("uhd")) return 100;
      if (q.includes("1440") || q.includes("2k")) return 80;
      if (q.includes("1080") || q.includes("fhd")) return 60;
      if (q.includes("720") || q.includes("hd")) return 40;
      if (q.includes("480") || q.includes("sd")) return 20;
      if (q.includes("360")) return 10;
      return 5;
    };

    const getCodecScore = (item: RawStreamPayload): number => {
      const text = `${item.title} ${item.quality || ''}`.toLowerCase();
      if (text.includes("h265") || text.includes("h.265") || text.includes("hevc") || text.includes("x265")) return 10;
      if (text.includes("h264") || text.includes("h.264") || text.includes("avc") || text.includes("x264")) return 5;
      if (text.includes("vp9")) return 8;
      if (text.includes("av1")) return 9;
      return 0;
    };

    uniqueResults.sort((a, b) => {
      // 1. Compare Quality
      const qA = getQualityScore(a.quality);
      const qB = getQualityScore(b.quality);
      if (qA !== qB) return qB - qA;

      // 2. Compare Seeds
      const seedsA = a.seeds || 0;
      const seedsB = b.seeds || 0;
      if (seedsA !== seedsB) return seedsB - seedsA;

      // 3. Compare Codec Score
      const codecA = getCodecScore(a);
      const codecB = getCodecScore(b);
      if (codecA !== codecB) return codecB - codecA;

      // 4. Default: alphabetical title sorting
      return a.title.localeCompare(b.title);
    });

    return uniqueResults;
  }
}

export const ExtensionRegistry = new ExtensionRegistryManager();
