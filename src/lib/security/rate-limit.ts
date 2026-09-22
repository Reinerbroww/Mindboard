const WINDOW_MS = 60 * 1000;

// Minimal in-memory fixed-window rate limiter. Export for potential future
// swap to Redis-backed storage.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function prune() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window rate limit. Returns true when the caller is allowed,
 * false once the limit has been exceeded.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS
): boolean {
  if (buckets.size > 10_000) prune();

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}