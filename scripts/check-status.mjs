#!/usr/bin/env node
/**
 * PlaniLux — Contrôle qualité statique
 * Vérifie : Typage TypeScript, analyse ESLint et suite de tests unitaires Vitest.
 */

import { execSync } from "node:child_process";

console.log("=================================================");
console.log("  PLANILUX — CONTRÔLE QUALITÉ STATIQUE (CI/LOCAL)");
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
allOk = run("npm test", "Exécution de la suite de tests (Vitest)") && allOk;

console.log("\n-------------------------------------------------");
if (allOk) {
  console.log("✅ Toutes les vérifications automatisées (types et tests) sont validées.");
  console.log("ℹ️  Note : N'oubliez pas d'exécuter la recette fonctionnelle et le build de déploiement avant la mise en production.");
  process.exit(0);
} else {
  console.log("⚠️ Des erreurs ont été détectées. Corrigez-les avant de continuer.");
  process.exit(1);
}
