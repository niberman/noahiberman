// In-memory per-IP rate limiting for the chat endpoints. Each isolate keeps its
// own buckets; that is intentionally approximate, it only needs to stop a single
// client from hammering the model.

export const RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** One limiter per function module; buckets are not shared between endpoints. */
export function createRateLimiter(max: number, windowMs = RATE_LIMIT_WINDOW_MS) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (ip: string): RateLimitStatus => {
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(ip, { count: 1, resetAt });
      return { allowed: true, remaining: max - 1, resetAt };
    }

    if (bucket.count >= max) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
  };
}

export function rateLimitHeaders(status: RateLimitStatus): Record<string, string> {
  return {
    "X-RateLimit-Remaining": status.remaining.toString(),
    "X-RateLimit-Reset": status.resetAt.toString(),
  };
}
