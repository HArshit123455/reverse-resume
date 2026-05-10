import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// pgvector custom type — 1024 dims to match Voyage voyage-3 / voyage-code
const vector1024 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return JSON.parse(value);
  },
});

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    sourceType: text("source_type").notNull(), // 'github' | 'experience' | 'snippet'
    sourceUrl: text("source_url"), // GitHub blob URL when github; null for mdx
    sourceProject: text("source_project"), // e.g., 'job-mcp' | 'auth' | 'insights'
    filePath: text("file_path"), // repo-relative or content/-relative
    title: text("title"),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    embedding: vector1024("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contentHashIdx: uniqueIndex("documents_content_hash_idx").on(t.contentHash),
    sourceIdx: index("documents_source_idx").on(t.sourceType, t.sourceProject),
    // HNSW index added by raw SQL in migration (not yet in drizzle-kit)
  })
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  ipHash: text("ip_hash").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    tokensIn: bigint("tokens_in", { mode: "number" }).notNull().default(0),
    tokensOut: bigint("tokens_out", { mode: "number" }).notNull().default(0),
    citations: jsonb("citations").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  })
);

export const rateLimits = pgTable("rate_limits", {
  ipHash: text("ip_hash").primaryKey(),
  bucketTokens: doublePrecision("bucket_tokens").notNull(),
  lastRefill: timestamp("last_refill", { withTimezone: true }).defaultNow().notNull(),
});

export const spendTracking = pgTable("spend_tracking", {
  dateIst: date("date_ist").primaryKey(), // IST midnight, stored as date
  centsSpent: bigint("cents_spent", { mode: "number" }).notNull().default(0),
});

// Export inferred types for use elsewhere
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
