import { randomBytes } from "node:crypto";
import pg from "pg";

/**
 * Database URL for one test file. Embedded PGlite by default; with TEST_DATABASE_URL, a fresh
 * PostgreSQL database per file, so files can run in parallel. Call `drop` after the file.
 */
export async function testDatabase(): Promise<{ url: string; drop: () => Promise<void> }> {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) return { url: "pglite:memory", drop: async () => {} };
  const name = `test_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();
  const url = new URL(base);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: async () => {
      const c = new pg.Client({ connectionString: base });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}
