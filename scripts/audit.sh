#!/usr/bin/env bash
# Audit de sécurité des dépendances (veille automatisée, voir docs/veille.md).
#
#   ./scripts/audit.sh
#
# Lance `npm audit` (dépendances de production) sur le backend, le front et le
# projet E2E, et écrit un rapport par projet dans resultats/audit/.
# Code de sortie : 0 = aucune vulnérabilité "high" ou "critical" ; 1 = au moins
# une. Jenkins traduit 1 en build "instable" (jaune) et non en échec : une
# alerte doit être VUE et TRAITÉE, sans casser la livraison pour une faille
# transitive sans correctif (cas réel : mysql2 via Prisma, voir CLAUDE.md).
set -uo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SORTIE="$RACINE/resultats/audit"
mkdir -p "$SORTIE"

statut=0
for projet in backend frontend e2e; do
  echo "==> npm audit : $projet"
  ( cd "$RACINE/$projet" && npm audit --omit=dev --audit-level=high ) > "$SORTIE/$projet.txt" 2>&1
  code=$?
  cat "$SORTIE/$projet.txt"
  if (( code != 0 )); then statut=1; fi
done

exit "$statut"
