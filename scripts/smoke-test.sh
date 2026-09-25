#!/usr/bin/env bash
# Test de fumée : la pile répond-elle, et de bout en bout (front, API, base) ?
#
#   ./scripts/smoke-test.sh [URL_API] [URL_FRONT]
#   défauts : http://localhost:3000  http://localhost:5173
#
# Réessaie jusqu'à ATTENTE_MAX_S secondes (défaut 120) : l'API attend que la
# base soit prête, puis applique les migrations avant d'écouter.
# Vérifie : la route de santé, une recherche géolocalisée (qui traverse
# l'API, Prisma et la requête PostGIS — donc prouve que la base et ses
# migrations sont en place) et la page d'accueil du front.
set -euo pipefail

API="${1:-http://localhost:3000}"
FRONT="${2:-http://localhost:5173}"
ATTENTE_MAX_S="${ATTENTE_MAX_S:-120}"

attendre() {
  local description="$1" url="$2" motif="$3" debut
  debut=$(date +%s)
  until curl -fsS "$url" 2>/dev/null | grep -q "$motif"; do
    if (( $(date +%s) - debut > ATTENTE_MAX_S )); then
      echo "ÉCHEC : $description ne répond pas correctement ($url)" >&2
      return 1
    fi
    sleep 2
  done
  echo "OK    : $description"
}

attendre "API — route de santé" "$API/api/v1/sante" '"statut":"ok"'
attendre "API + base — recherche géolocalisée" "$API/api/v1/evenements/recherche?latitude=48.85&longitude=2.35" '^\['
attendre "Front — page d'accueil" "$FRONT" '<div id="root">'

echo "Test de fumée réussi."
