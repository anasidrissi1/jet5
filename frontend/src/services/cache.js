const memoryCache = new Map();

export function getCachedValue(key, staleTimeMs) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > staleTimeMs) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

export function setCachedValue(key, value) {
  memoryCache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

export function invalidateCache(prefix = '') {
  if (!prefix) {
    memoryCache.clear();
    return;
  }

  Array.from(memoryCache.keys()).forEach((key) => {
    if (String(key).startsWith(prefix)) {
      memoryCache.delete(key);
    }
  });
}
