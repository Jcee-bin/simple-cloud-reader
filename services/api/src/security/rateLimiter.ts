import type { preHandlerHookHandler } from "fastify";

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();

  constructor(
    private readonly options: {
      now?: () => number;
      maxKeys?: number;
    } = {},
  ) {}

  consume(key: string, policy: RateLimitPolicy) {
    const now = (this.options.now ?? Date.now)();
    const existing = this.entries.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + policy.windowMs }
      : existing;
    entry.count += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);

    const maxKeys = this.options.maxKeys ?? 10_000;
    while (this.entries.size > maxKeys) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }

    return {
      allowed: entry.count <= policy.limit,
      remaining: Math.max(policy.limit - entry.count, 0),
      resetAt: entry.resetAt,
    };
  }

  get size(): number {
    return this.entries.size;
  }
}

export function createRateLimitHook(input: {
  limiter: FixedWindowRateLimiter;
  scope: string;
  policy: RateLimitPolicy;
  authenticated?: boolean;
}): preHandlerHookHandler {
  return async (request, reply) => {
    const identity = input.authenticated
      ? request.auth.userId
      : request.ip;
    const result = input.limiter.consume(
      `${input.scope}:${identity}`,
      input.policy,
    );
    reply.header("x-ratelimit-limit", input.policy.limit);
    reply.header("x-ratelimit-remaining", result.remaining);
    reply.header("x-ratelimit-reset", Math.ceil(result.resetAt / 1_000));
    if (!result.allowed) {
      const retryAfter = Math.max(
        Math.ceil((result.resetAt - Date.now()) / 1_000),
        1,
      );
      return reply
        .header("retry-after", retryAfter)
        .code(429)
        .send({ error: "rate_limit_exceeded" });
    }
  };
}
