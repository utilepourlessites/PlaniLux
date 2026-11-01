import { Pool } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
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

    const migrationsDir = join(process.cwd(), "drizzle");
    const sqlFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const sqlFile of sqlFiles) {
      const fullPath = join(migrationsDir, sqlFile);
      const sqlContent = readFileSync(fullPath, "utf-8");

      console.log(`⏳ Application de la migration: ${sqlFile}`);
      await client.query(sqlContent);
      console.log(`✅ Migration réussie: ${sqlFile}`);
    }

    client.release();
    await pool.end();
    console.log("🎉 Toutes les migrations de base de données ont été appliquées avec succès !");
  } catch (error) {
    console.error("❌ Échec de la migration:", error);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

runMigrations();
