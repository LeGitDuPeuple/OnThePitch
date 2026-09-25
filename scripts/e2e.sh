#!/usr/bin/env bash
# Tests de bout en bout (Playwright) contre une pile complète JETABLE.
#
#   ./scripts/e2e.sh
#
# Démarre base + API + front dans des conteneurs dédiés (projet Docker
# "onthepitch-ci", voir docker-compose.ci.yml : noms, volume et ports distincts
# du poste de développement), attend qu'ils répondent, lance la suite E2E, puis
# détruit TOUT (conteneurs et volume) même en cas d'échec.
#
# Prérequis : Docker Compose, Node.js, Google Chrome (les tests utilisent
# "channel: chrome"), et les ports 3000 et 5173 LIBRES : l'URL de l'API est
# figée dans le build du front et l'origine autorisée (CORS) est
# http://localhost:5173 — à ne pas lancer pendant que le poste de dev tourne.
#
# Aucun secret requis : mot de passe de base et clé JWT sont générés au hasard
# à chaque exécution, et SMTP n'est pas configuré — les notifications
# retombent sur le compte de test Ethereal, aucun vrai email n'est envoyé.
# Les tests appellent en revanche la vraie API Adresse du gouvernement
# (géocodage, non simulé volontairement) : un 503 ponctuel est possible.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

PROJET="onthepitch-ci"
FICHIER_ENV="$RACINE/.env.ci"
# Chemins ABSOLUS : le script change de dossier (cd e2e) avant de finir, et le
# nettoyage doit retrouver les fichiers compose depuis n'importe où (un chemin
# relatif l'a fait échouer en silence, laissant conteneurs et volume en place).
COMPOSE=(docker compose -p "$PROJET" --project-directory "$RACINE"
  -f "$RACINE/docker-compose.yml" -f "$RACINE/docker-compose.ci.yml" --env-file "$FICHIER_ENV")

MOT_DE_PASSE_BASE="$(openssl rand -hex 16)"
cat > "$FICHIER_ENV" <<ENV
POSTGRES_DB=onthepitch
POSTGRES_USER=onthepitch
POSTGRES_PASSWORD=$MOT_DE_PASSE_BASE
JWT_SECRET=$(openssl rand -hex 32)
PORT=3000
API_ADRESSE_URL=https://api-adresse.data.gouv.fr/search
DATABASE_URL=postgresql://onthepitch:$MOT_DE_PASSE_BASE@db:5432/onthepitch
LIMITE_TENTATIVES=1000
ENV_FILE=$FICHIER_ENV
ENV

# Toujours nettoyer (-v supprime aussi le volume de la base de test).
nettoyer() {
  echo "==> Nettoyage de la pile de test"
  # Sans exit : un échec de nettoyage ne doit pas masquer le résultat des tests,
  # mais il doit se VOIR (des conteneurs oubliés occupent les ports 3000/5173).
  "${COMPOSE[@]}" down -v --remove-orphans \
    || echo "AVERTISSEMENT : nettoyage incomplet, à faire à la main : docker compose -p $PROJET down -v" >&2
  rm -f "$FICHIER_ENV"
}
trap nettoyer EXIT

echo "==> Démarrage de la pile de test"
"${COMPOSE[@]}" up -d --build

echo "==> Attente de la pile"
"$RACINE/scripts/smoke-test.sh"

echo "==> Tests E2E"
cd "$RACINE/e2e"
npm ci
# CI=true : rapports JUnit + HTML (e2e/resultats, e2e/playwright-report)
CI=true npx playwright test
