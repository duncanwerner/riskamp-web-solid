/**
 * this cache is used to store files. as such we should probably
 * switch to using OPFS.
 * 
 * we probably want to switch over gracefully so we should keep 
 * the cache but make it read-only, and eventually we can drop it
 * altogether.
 */

let cache_: Cache | undefined;
let cache_initialized = false;

// removing top-level await, requires that we load the cache at some
// point and don't overlap with any other operation

const EnsureCache = async () => {
  if (cache_initialized) {
    return cache_;
  }
  if (typeof caches !== 'undefined') {
    cache_initialized = true;
    cache_ = await caches.open('local');
    return cache_;
  }
  return undefined;
};

/** canonical URL for key */
const CacheURL = (key: string) => '/local-cache?key=' + key;

export const Set = async (key: string, data: unknown) => {
  const cache = await EnsureCache();
  if (cache) {
    const response = new Response(JSON.stringify(data));
    await cache.put(CacheURL(key), response);
    return true;
  }
  return false;
};

export const Get = async (key: string) => {
  const cache = await EnsureCache();
  if (cache) {
    const response = await cache.match(CacheURL(key));
    if (response) {
      return response.json();
    }
    return undefined;
  }
  throw new Error('no cache');
};

export const Delete = async (key: string) => {
  const cache = await EnsureCache();
  if (cache) {
    return await cache.delete(CacheURL(key));
  }
  return false;
};

export const Flush = async () => {
  const cache = await EnsureCache();
  if (cache) {
    for (const key of await cache.keys()) {
      await cache.delete(key);
    }
  }
};

export const ListKeys = async () => {
  const keys: string[] = [];
  const cache = await EnsureCache();
  if (cache) {
    for (const key of await cache.keys()) {
      const match = key.url.match(/key=(.*?)$/);
      if (match) {
        keys.push(match[1]);
      }
    }
  }
  return keys;
}
