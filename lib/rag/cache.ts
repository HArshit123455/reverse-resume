// lib/rag/cache.ts
//
// Process-local LRU. Single-region Vercel deploy → fine. If we ever go
// multi-region, swap for a Postgres-backed cache table (the read shape
// — getChunks(messageId) — won't change).
import { LRUCache } from "lru-cache";
import type { Audience } from "@/lib/sse";

export interface CacheEntry {
  chunkIds: string[];
  question: string;
  audience: Audience;
  storedAt: number;
}

const cache = new LRUCache<string, CacheEntry>({
  max: 200,
  ttl: 10 * 60 * 1000,
});

export function cacheChunks(
  messageId: string,
  entry: Omit<CacheEntry, "storedAt">
): void {
  cache.set(messageId, { ...entry, storedAt: Date.now() });
}

export function getChunks(messageId: string): CacheEntry | undefined {
  return cache.get(messageId);
}

export function _resetForTests(): void {
  cache.clear();
}
