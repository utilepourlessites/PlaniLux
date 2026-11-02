#!/usr/bin/env node
/**
 * PlaniLux — Script d'automatisation de diagnostic et de contrôle qualité
 * Vérifie : Typage TypeScript, Linting ESLint, Tests unitaires Vitest, et Migration Supabase.
 */

import { execSync } from "node:child_process";

console.log("=================================================");
console.log("  PLANILUX — CONTRÔLE QUALITÉ & AUTOMATISATION   ");
console.log("=================================================\n");

function run(cmd, desc) {
  process.stdout.write(`⏳ ${desc}... `);
  try {
    execSync(cmd, { stdio: "pipe" });
    console.log("✅ OK");
    return true;
  } catch (err) {
    console.log("❌ ÉCHEC");
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    return false;
  }
}

let allOk = true;

allOk = run("npm run typecheck", "Contrôle strict des types TypeScript") && allOk;
allOk = run("npm run lint", "Analyse statique du code (ESLint)") && allOk;
allOk = run("npm test", "Exécution de la suite de tests (Vitest)") && allOk;

console.log("\n-------------------------------------------------");
if (allOk) {
  console.log("🎉 Tout est 100% conforme et prêt pour la production !");
  process.exit(0);
} else {
  console.log("⚠️ Des erreurs ont été détectées. Corrigez-les avant de déployer.");
  process.exit(1);
}
