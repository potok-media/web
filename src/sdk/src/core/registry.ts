export type CallbackFunction = (...args: any[]) => any;

export interface CallbackEntry {
  cb: CallbackFunction;
  slotId: string;
  createdAt: number;
  persistent?: boolean;
}

export class CallbackRegistry {
  public static callbacks = new Map<string, CallbackEntry>();
  private static activeSlotId: string | null = null;
  private static activeRenderCallbacks = new Set<string>();
  private static readonly TTL = 300000; // 5 minutes auto-expiration
  private static readonly MAX_CALLBACKS = 500;

  // Periodic GC loop every 30 seconds to clean up expired callbacks
  static {
    setInterval(() => {
      CallbackRegistry.cleanup();
    }, 30000);
  }

  static register(cb: CallbackFunction, stableId?: string, persistent = false): string {
    this.cleanup();
    const id = stableId ? `stable_${stableId}` : "cb_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    const slotId = this.activeSlotId || "global";
    const isPersistent = persistent || slotId === "global";
    
    this.callbacks.set(id, { cb, slotId, createdAt: Date.now(), persistent: isPersistent });
    this.activeRenderCallbacks.add(id);

    // Enforce max callback limit to prevent leaks under heavy load
    if (this.callbacks.size > this.MAX_CALLBACKS) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.callbacks.entries()) {
        if (!v.persistent && v.createdAt < oldestTime) {
          oldestTime = v.createdAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.callbacks.delete(oldestKey);
      }
    }
    return id;
  }

  static get(id: string): CallbackFunction | undefined {
    const entry = this.callbacks.get(id);
    if (!entry) return undefined;
    if (!entry.persistent && Date.now() - entry.createdAt > this.TTL) {
      this.callbacks.delete(id);
      return undefined;
    }
    return entry.cb;
  }

  static delete(id: string): void {
    this.callbacks.delete(id);
  }

  static trigger(id: string, data: any): void {
    const entry = this.callbacks.get(id);
    if (entry) {
      if (!entry.persistent && Date.now() - entry.createdAt > this.TTL) {
        this.callbacks.delete(id);
        return;
      }
      const { cb } = entry;
      if (data && typeof data === 'object') {
        if ('seasonNum' in data && 'epNum' in data) {
          cb(data.seasonNum, data.epNum);
        } else if ('episode' in data && 'audioId' in data) {
          cb(data.episode, data.audioId);
        } else {
          cb(data);
        }
      } else {
        cb(data);
      }
    }
  }

  static startRenderScope(slotId: string): void {
    this.activeSlotId = slotId;
    this.activeRenderCallbacks.clear();
  }

  static commitRenderScope(slotId: string): void {
    for (const [k, v] of this.callbacks.entries()) {
      if (v.slotId === slotId && !this.activeRenderCallbacks.has(k)) {
        this.callbacks.delete(k);
      }
    }
    this.activeSlotId = null;
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.callbacks.entries()) {
      if (!v.persistent && now - v.createdAt > this.TTL) {
        this.callbacks.delete(k);
      }
    }
  }
}

export class CallbackScope {
  private ids = new Set<string>();

  register(cb: CallbackFunction, stableId?: string): string {
    const id = CallbackRegistry.register(cb, stableId);
    this.ids.add(id);
    return id;
  }

  dispose(): void {
    for (const id of this.ids) {
      CallbackRegistry.delete(id);
    }
    this.ids.clear();
  }
}
