import { sql } from "drizzle-orm";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

export interface TokenBucketConfig {
  maxTokens: number;
  refillPerSecond: number;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

type AnyDb = TestDb | ReturnType<typeof dbFn>;

/**
 * Atomically refill + decrement a token bucket for the given IP hash.
 * Bucket is allowed to go negative; that gives a meaningful retryAfter
 * instead of a generic "try later".
 */
export async function consume(
  db: AnyDb,
  ipHash: string,
  config: TokenBucketConfig,
  cost = 1
): Promise<ConsumeResult> {
  const { maxTokens, refillPerSecond } = config;

  const result = await db.execute<{ bucket_tokens: number }>(sql`
    INSERT INTO rate_limits (ip_hash, bucket_tokens, last_refill)
    VALUES (${ipHash}, ${maxTokens}::double precision - ${cost}::double precision, now())
    ON CONFLICT (ip_hash) DO UPDATE
    SET
      bucket_tokens = LEAST(
        ${maxTokens}::double precision,
        rate_limits.bucket_tokens
          + EXTRACT(EPOCH FROM (now() - rate_limits.last_refill))
            * ${refillPerSecond}::double precision
      ) - ${cost}::double precision,
      last_refill = now()
    RETURNING bucket_tokens
  `);

  const bucketTokens = Number(result[0].bucket_tokens);

  if (bucketTokens >= 0) {
    return { allowed: true, remaining: bucketTokens };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil(-bucketTokens / refillPerSecond),
  };
}
