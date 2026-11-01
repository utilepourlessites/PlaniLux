import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const globalForDb = globalThis as typeof globalThis & {
    __planiluxPostgresqlPool?: Pool;
  };

  _pool =
    globalForDb.__planiluxPostgresqlPool ??
    new Pool({
      connectionString: url,
      max: 1, // 1 connexion par instance serverless
      idleTimeoutMillis: 10_000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__planiluxPostgresqlPool = _pool;
  }

  _db = drizzle(_pool);
  return _db;
}

export function getPool() {
  if (!_pool) {
    getDb();
  }
  return _pool;
}

// Proxy pour maintenir la compatibilité descendante avec tout import de `db` sans évaluer au chargement du module
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
