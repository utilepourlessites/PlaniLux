#!/usr/bin/env node
/**
 * PlaniLux — Script de réinitialisation et purge des données de démonstration / test.
 * EXIGE LE DRAPEAU EXPLICITE --confirm POUR TOUTE EXÉCUTION.
 */

const args = process.argv.slice(2);
const confirmed = args.includes("--confirm");

if (!confirmed) {
  console.log(`
======================================================================
  ATTENTION : SCRIPT DE PURGE DES DONNÉES PLANILUX
======================================================================

Ce script est conçu pour purger :
  - Tous les tableaux existants (table public.planner_boards)
  - Les profils de test et tableaux de démonstration

POUR EXÉCUTER CETTE PURGE DE FAÇON DÉFINITIVE, VOUS DEVEZ LANCER :
  node scripts/reset-data.mjs --confirm

Aucune action n'a été effectuée.
`);
  process.exit(1);
}

console.log("Drapeau --confirm détecté. Pour exécuter cette purge sur votre base Supabase,");
console.log("veuillez exécuter la commande SQL suivante dans le SQL Editor de Supabase :");
console.log(`
TRUNCATE TABLE public.planner_boards CASCADE;
-- Pour réinitialiser également les profils utilisateurs :
-- TRUNCATE TABLE public.profiles CASCADE;
`);
