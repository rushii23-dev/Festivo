/**
 * Per-client token bucket. Each key starts with `capacity` tokens and refills at
 * `refillPerSecond`. In-memory and per instance: enough to blunt abuse of a
 * single deployment; a multi-instance setup would move this to Redis.
 */

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
  /** Buckets kept before old ones are dropped (see `evictOne`). */
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

  const tokensAt = (bucket: Bucket, time: number) =>
    Math.min(
      capacity,
      bucket.tokens + (Math.max(0, time - bucket.updatedAt) / 1000) * refillPerSecond,
    );

  /**
   * Drops the least recently seen bucket that is not currently blocked. A flood of
   * new keys (rotating addresses) therefore cannot push a blocked client out of the
   * map and hand it a fresh bucket. Only when every bucket is blocked does the
   * oldest go, so memory stays bounded whatever happens.
   */
  const evictOne = (time: number) => {
    for (const [key, bucket] of buckets) {
      if (tokensAt(bucket, time) >= 1) {
        buckets.delete(key);
        return;
      }
    }
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  };

  return {
    take(key, cost = 1) {
      const time = now();
      const existing = buckets.get(key);
      const tokens = existing ? tokensAt(existing, time) : capacity;
      const allowed = tokens >= cost;

      // Move the key to the end so the least recently seen keys are evicted first.
      buckets.delete(key);
      buckets.set(key, { tokens: allowed ? tokens - cost : tokens, updatedAt: time });
      while (buckets.size > maxKeys) evictOne(time);

      if (allowed) {
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

const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6 = /^[0-9a-f:]{2,39}$/;

/** Expands an IPv6 address to its eight groups, or null when it is not one. */
function ipv6Groups(address: string): string[] | null {
  if (!IPV6.test(address) || (address.match(/::/g) ?? []).length > 1) return null;
  const [head = "", tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = 8 - left.length - right.length;
  if (tail === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array<string>(Math.max(0, missing)).fill("0"), ...right];
  return groups.every((group) => /^[0-9a-f]{1,4}$/.test(group)) ? groups : null;
}

/**
 * Normalises one address for use as a rate-limit key: strips a port or zone,
 * unwraps IPv4-mapped IPv6, and groups IPv6 by /64 (one home or phone network
 * hands out a whole /64, so per-address keys would be trivial to rotate).
 * Anything that is not an IP address gives null.
 */
export function normalizeIp(raw: string): string | null {
  let address = raw.trim().toLowerCase();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(address);
  if (bracketed?.[1]) address = bracketed[1];
  else if (/^[\d.]+:\d+$/.test(address)) address = address.slice(0, address.indexOf(":"));
  address = address.replace(/%.*$/, "");

  const mapped = /^::ffff:([\d.]+)$/.exec(address);
  if (mapped?.[1]) address = mapped[1];
  if (IPV4.test(address)) return address;

  const groups = ipv6Groups(address);
  return groups
    ? `${groups
        .slice(0, 4)
        .map((g) => g.replace(/^0+(?=.)/, ""))
        .join(":")}::/64`
    : null;
}

/** How many proxies in front of the app append to X-Forwarded-For (default 1). */
export function trustedProxyHops(
  env: Record<string, string | undefined> = process.env,
): number {
  const hops = Number(env.TRUSTED_PROXY_HOPS);
  return Number.isInteger(hops) && hops >= 1 && hops <= 10 ? hops : 1;
}

/**
 * The client's address as the nearest trusted proxy saw it. X-Forwarded-For is
 * read from the right: each proxy appends the address it received the request
 * from, and everything to the left of our own proxies is whatever the client
 * chose to send, so the first entry must never be trusted. Vercel overwrites the
 * header with the real client address; Cloud Run appends it; an extra load
 * balancer in front of Cloud Run adds one more hop (set TRUSTED_PROXY_HOPS=2).
 */
export function clientKey(headers: Headers, hops = trustedProxyHops()): string {
  const forwarded = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate =
    forwarded.length > 0
      ? forwarded[Math.max(0, forwarded.length - hops)]
      : headers.get("x-real-ip");
  return (candidate && normalizeIp(candidate)) ?? "anonymous";
}
