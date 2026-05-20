interface Entry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, Entry>>();

function getStore(name: string): Map<string, Entry> {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

export function rateLimit(
  storeKey: string,
  ip: string,
  limit: number,
  windowMs: number,
): boolean {
  const store = getStore(storeKey);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

const tokenFailures = new Map<string, Entry>();

export function trackTokenFailure(ip: string): void {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const entry = tokenFailures.get(ip);
  if (!entry || now > entry.resetAt) {
    tokenFailures.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }
}

export function isTokenBlocked(ip: string): boolean {
  const entry = tokenFailures.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    tokenFailures.delete(ip);
    return false;
  }
  return entry.count >= 10;
}
