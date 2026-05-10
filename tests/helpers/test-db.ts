import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as schema from "@/lib/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface TestDbContext {
  db: TestDb;
  cleanup: () => Promise<void>;
}

/**
 * Spins up an ephemeral Postgres container with pgvector for tests.
 * Slower than mocking (~3s startup) but tests real SQL behaviour.
 */
export async function setupTestDb(): Promise<TestDbContext> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("pgvector/pgvector:pg16")
    .start();

  const client = postgres(container.getConnectionUri(), { max: 1 });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  return {
    db,
    cleanup: async () => {
      await client.end();
      await container.stop();
    },
  };
}
