/**
 * Per-client token bucket. Each key starts with `capacity` tokens and refills at
 * `refillPerSecond`. In-memory and per instance: enough to blunt abuse of a
 * single deployment; a multi-instance setup would move this to Redis.
 */

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
  /** Buckets kept before the least recently seen are dropped. */
  maxKeys?: number;
  now?: () => number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Whole seconds until one token is available again (0 when allowed). */
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimiter {
  take(key: string, cost?: number): RateLimitDecision;
  reset(): void;
  readonly size: number;
}

export function createRateLimiter({
  capacity,
  refillPerSecond,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimitOptions): RateLimiter {
  if (!(capacity > 0) || !(refillPerSecond > 0)) {
    throw new RangeError("capacity and refillPerSecond must be positive");
  }
  const buckets = new Map<string, Bucket>();

  return {
    take(key, cost = 1) {
      const time = now();
      const existing = buckets.get(key);
      const elapsed = existing ? Math.max(0, time - existing.updatedAt) / 1000 : 0;
      const tokens = existing
        ? Math.min(capacity, existing.tokens + elapsed * refillPerSecond)
        : capacity;

      // Move the key to the end so the least recently seen keys are evicted first.
      buckets.delete(key);
      if (tokens >= cost) {
        buckets.set(key, { tokens: tokens - cost, updatedAt: time });
      } else {
        buckets.set(key, { tokens, updatedAt: time });
      }
      while (buckets.size > maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest === undefined) break;
        buckets.delete(oldest);
      }

      if (tokens >= cost) {
        return {
          allowed: true,
          remaining: Math.floor(tokens - cost),
          retryAfterSeconds: 0,
        };
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((cost - tokens) / refillPerSecond)),
      };
    },
    reset() {
      buckets.clear();
    },
    get size() {
      return buckets.size;
    },
  };
}

/**
 * Best-effort client identifier from proxy headers. Cloud Run and Vercel set
 * x-forwarded-for; the first entry is the original client.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : "anonymous";
}
