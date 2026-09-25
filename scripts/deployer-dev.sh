#!/usr/bin/env bash
# Déploiement de l'environnement de DÉVELOPPEMENT / DÉMONSTRATION.
#
#   ./scripts/deployer-dev.sh
#
# Prérequis : Docker + Docker Compose, et un fichier .env à la racine (copie de
# .env.example, avec POSTGRES_PASSWORD et JWT_SECRET renseignés).
#
# Ce que fait le script :
#   1. construit les images de l'API et du front (Dockerfiles multi-étapes) ;
#   2. démarre base, API et front (docker compose) — l'API attend que la base
#      soit saine puis applique les migrations Prisma toute seule ;
#   3. vérifie que tout répond (scripts/smoke-test.sh).
# Idempotent : le relancer met simplement la pile à jour.
# Accès ensuite : front http://localhost:5173, API http://localhost:3000.
# Arrêt : docker compose down   (les données restent, volume db_data).
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

if [[ ! -f .env ]]; then
  echo "ERREUR : .env introuvable. Copiez .env.example en .env et renseignez POSTGRES_PASSWORD et JWT_SECRET." >&2
  exit 1
fi

docker compose up -d --build
"$RACINE/scripts/smoke-test.sh"
