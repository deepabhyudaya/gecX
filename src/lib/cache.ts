
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();

  set(key: string, value: any, ttlMs: number = 30000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

if (typeof window === "undefined") {
  setInterval(() => {
    memoryCache.cleanup();
  }, 300000);
}