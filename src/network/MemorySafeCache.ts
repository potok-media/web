interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * LRU-eviction-based in-memory cache with an automated Garbage Collector.
 * Utilized by hooks such as useSeasonEpisodes.ts to eliminate skeletal flashing and minimize network overhead.
 */
export class MemorySafeCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private gcIntervalId: any = null;

  private static instances = new Set<MemorySafeCache>();

  public static clearAll(): void {
    for (const instance of MemorySafeCache.instances) {
      instance.clear();
    }
  }

  constructor(ttlMs = 300000, maxSize = 100) { // 5 minutes TTL, max 100 elements
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    MemorySafeCache.instances.add(this);
    this.startGarbageCollector();
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU update: refresh position in Map
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  public set<T>(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  private startGarbageCollector(): void {
    if (typeof setInterval !== "undefined") {
      this.gcIntervalId = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now > entry.expiresAt) {
            this.cache.delete(key);
          }
        }
      }, 60000); // GC runs every minute
    }
  }

  public destroy(): void {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
    }
    MemorySafeCache.instances.delete(this);
  }
}
