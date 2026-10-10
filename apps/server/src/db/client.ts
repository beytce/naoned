import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import pg from "pg";
import * as schema from "./schema.js";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Database {
  db: Db;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");

/** PostgreSQL in production; embedded PGlite (`pglite:<dir>` or `pglite:memory`) in dev and tests. */
export function openDatabase(url: string): Database {
  if (url.startsWith("pglite:")) {
    const target = url.slice("pglite:".length);
    if (target !== "memory") mkdirSync(target, { recursive: true });
    const client = new PGlite(target === "memory" ? undefined : target);
    const db = drizzlePglite(client, { schema });
    return {
      db: db as unknown as Db,
      migrate: () => migratePglite(db, { migrationsFolder }),
      close: () => client.close(),
    };
  }
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzleNodePg(pool, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migrateNodePg(db, { migrationsFolder }),
    close: () => pool.end(),
  };
}
