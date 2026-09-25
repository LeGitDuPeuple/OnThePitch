#!/usr/bin/env bash
# Jenkins de démonstration en local (Docker) : construit l'image, la lance, et
# affiche l'adresse. Sert à montrer le pipeline et à VALIDER le Jenkinsfile.
#
#   ./scripts/jenkins-local.sh            démarre (construit l'image au besoin)
#   ./scripts/jenkins-local.sh arreter    arrête et supprime le conteneur
#   ./scripts/jenkins-local.sh lancer     déclenche un build complet (E2E inclus)
#
# Accès : http://localhost:8085   identifiant "admin", mot de passe de démonstration
# ci-dessous (à ne JAMAIS réutiliser ailleurs).
# Le dépôt est lu depuis ce dossier (branche main, monté en lecture seule) :
# Jenkins ne voit que ce qui est COMMITTÉ.
# Le Docker de l'hôte est piloté via sa socket ; --network host pour que Jenkins
# atteigne les ports 3000/5173 des conteneurs de test.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
NOM="onthepitch-jenkins"
PORT="${JENKINS_PORT:-8085}"
MOT_DE_PASSE="demo-onthepitch"

case "${1:-demarrer}" in
  arreter)
    docker rm -f "$NOM" >/dev/null 2>&1 && echo "Jenkins arrêté." || echo "Jenkins n'était pas lancé."
    ;;
  lancer)
    JENKINS="http://localhost:$PORT"
    AUTH=(-u "admin:$MOT_DE_PASSE")
    JARRE="$(mktemp)"
    trap 'rm -f "$JARRE"' EXIT
    # Le jeton anti-CSRF de Jenkins est lié à la session : il faut réutiliser le cookie.
    JETON="$(curl -fsS -c "$JARRE" "${AUTH[@]}" "$JENKINS/crumbIssuer/api/json" | sed -E 's/.*"crumb":"([^"]+)".*/\1/')"
    declencher() { curl -fsS -b "$JARRE" "${AUTH[@]}" -H "Jenkins-Crumb: $JETON" -X POST "$JENKINS/job/onthepitch/$1" -o /dev/null; }

    # Les paramètres du Jenkinsfile (LANCER_E2E) ne sont connus de Jenkins qu'après
    # un PREMIER build : sans lui, on lance d'abord un build simple.
    if curl -fsS "${AUTH[@]}" "$JENKINS/job/onthepitch/api/json" | grep -q '"parameterDefinitions"'; then
      declencher "buildWithParameters?LANCER_E2E=true"
    else
      echo "Premier build (enregistre les paramètres) : relancez cette commande ensuite pour les E2E."
      declencher "build"
    fi
    echo "Build lancé : $JENKINS/job/onthepitch/"
    ;;
  demarrer)
    docker build -t onthepitch-jenkins "$RACINE/ci/jenkins"
    docker rm -f "$NOM" >/dev/null 2>&1 || true
    docker run -d --name "$NOM" --network host --shm-size=1g \
      --group-add "$(stat -c %g /var/run/docker.sock)" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "$RACINE":/depot:ro \
      -v onthepitch-jenkins-home:/var/jenkins_home \
      -e JENKINS_OPTS="--httpPort=$PORT" \
      -e JENKINS_PORT="$PORT" \
      -e JENKINS_ADMIN_PASSWORD="$MOT_DE_PASSE" \
      onthepitch-jenkins >/dev/null
    echo "Jenkins démarre : http://localhost:$PORT  (admin / $MOT_DE_PASSE) — compter ~1 minute."
    ;;
  *)
    echo "Usage : $0 [demarrer|arreter|lancer]" >&2
    exit 1
    ;;
esac
