import { Pool } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connectionString) {
    console.error("❌ ERREUR: DATABASE_URL ou DIRECT_URL non défini dans .env.local");
    process.exit(1);
  }

  console.log("🚀 Démarrage de la migration Drizzle vers Supabase...");

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // Table de traçage des migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // S'assurer de la contrainte unique sur hash
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '__drizzle_migrations_hash_unique'
        ) THEN
          ALTER TABLE "__drizzle_migrations" ADD CONSTRAINT "__drizzle_migrations_hash_unique" UNIQUE (hash);
        END IF;
      END
      $$;
    `);

    // Récupérer les migrations déjà exécutées
    const executedRes = await client.query(`SELECT hash FROM "__drizzle_migrations"`);
    const executedHashes = new Set(executedRes.rows.map(r => r.hash));

    const migrationsDir = join(process.cwd(), "drizzle");
    const sqlFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const sqlFile of sqlFiles) {
      const fullPath = join(migrationsDir, sqlFile);
      const sqlContent = readFileSync(fullPath, "utf-8");
      const hash = createHash("sha256").update(sqlContent).digest("hex");

      if (executedHashes.has(hash)) {
        console.log(`⏩ Migration déjà appliquée, ignorée: ${sqlFile}`);
        continue;
      }

      console.log(`⏳ Application de la migration: ${sqlFile}`);
      try {
        await client.query(sqlContent);
      } catch (sqlErr) {
        if (sqlErr.code === "42P07") {
          console.log(`ℹ️ La table existe déjà sur Supabase pour ${sqlFile}.`);
        } else {
          throw sqlErr;
        }
      }

      await client.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING`,
        [hash, Date.now()]
      );
      console.log(`✅ Migration enregistrée: ${sqlFile}`);
    }

    client.release();
    await pool.end();
    console.log("🎉 Toutes les migrations de base de données sont à jour !");
  } catch (error) {
    console.error("❌ Échec de la migration:", error);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

runMigrations();
