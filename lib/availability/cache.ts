type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class TTLCache<T> {
  private map = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number, private readonly maxSize: number) { }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T) {
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.map.clear();
  }
}

const DEFAULT_TTL_MS = 20_000; // 20 seconds
const DEFAULT_MAX_SIZE = 200;

export const daySlotsCache = new TTLCache<{ slots: any[] }>(DEFAULT_TTL_MS, DEFAULT_MAX_SIZE);
export const heatmapCache = new TTLCache<{ days: any[] }>(DEFAULT_TTL_MS, DEFAULT_MAX_SIZE);

export const availabilityCacheHeaders: Record<string, string> = {
  'Cache-Control': 's-maxage=20, stale-while-revalidate=60',
};

type DayCacheKeyParams = {
  serviceId: string;
  locationId: string;
  date: string; // YYYY-MM-DD
  staffId?: string | null;
  isTwin?: boolean;
};

export function makeDaySlotsCacheKey(params: DayCacheKeyParams): string {
  const { serviceId, locationId, date, staffId = null, isTwin = false } = params;
  return JSON.stringify({
    serviceId,
    locationId,
    date,
    staffId,
    isTwin,
  });
}

type HeatmapCacheKeyParams = {
  serviceId: string;
  locationId: string;
  start: string;
  end: string;
  staffId?: string | null;
};

export function makeHeatmapCacheKey(params: HeatmapCacheKeyParams): string {
  const { serviceId, locationId, start, end, staffId = null } = params;
  return JSON.stringify({
    serviceId,
    locationId,
    start,
    end,
    staffId,
  });
}

