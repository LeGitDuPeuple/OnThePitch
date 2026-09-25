#!/usr/bin/env bash
# Vérification rapide du code — AUCUNE base de données requise.
#
#   ./scripts/verifier.sh
#
# Enchaîne : installation exacte des dépendances (npm ci), génération du client
# Prisma, compilation TypeScript stricte du code et des tests, tests Jest de la
# couche Service (doubles en mémoire), puis compilation du front.
# Lancé par Jenkins à chaque push, et utilisable tel quel sur un poste.
# S'arrête au premier échec (set -e) : le code de sortie dit si c'est bon.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Backend : dépendances"
cd "$RACINE/backend"
npm ci

# Le client Prisma est généré (non versionné) : sans lui, tsc ne compile pas.
echo "==> Backend : client Prisma"
npx prisma generate --config prisma7.config.ts

echo "==> Backend : compilation (code, puis tests)"
npx tsc --noEmit
npm run typecheck:tests

echo "==> Backend : tests Jest"
# CI=true : ajoute le rapport JUnit (backend/resultats/jest-junit.xml)
CI=true npm test

echo "==> Frontend : dépendances et build"
cd "$RACINE/frontend"
npm ci
npm run build

echo "==> Vérification terminée : tout est vert."
