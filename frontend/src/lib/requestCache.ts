type CacheEntry<T> = {
  expiresAt: number;
  data?: T;
  promise?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();

type CachedJsonRequest = {
  cacheKey: string;
  url: string;
  headers?: HeadersInit;
  ttlMs?: number;
  force?: boolean;
};

export async function cachedJsonFetch<T>({
  cacheKey,
  url,
  headers,
  ttlMs = 30_000,
  force = false,
}: CachedJsonRequest): Promise<T> {
  const now = Date.now();
  const hit = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (!force && hit) {
    if (hit.data !== undefined && hit.expiresAt > now) return hit.data;
    if (hit.promise) return hit.promise;
  }

  const request = fetch(url, { headers })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return (await res.json()) as T;
    })
    .then((data) => {
      cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((err) => {
      cache.delete(cacheKey);
      throw err;
    });

  cache.set(cacheKey, { promise: request, expiresAt: now + ttlMs });
  return request;
}

export function primeJsonCache<T>(options: CachedJsonRequest): Promise<T | undefined> {
  return cachedJsonFetch<T>(options).catch(() => undefined);
}

export function invalidateRequestCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

