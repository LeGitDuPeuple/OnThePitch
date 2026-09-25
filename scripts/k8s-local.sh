#!/usr/bin/env bash
# Kubernetes LOCAL (kind = Kubernetes dans Docker) : un environnement « comme en
# production, mais sans serveur » — vrais objets Kubernetes (StatefulSet, Deployments,
# Services, sondes de santé, volume, secrets), sur ta machine.
#
#   ./scripts/k8s-local.sh              crée/met à jour tout (cluster, images, secrets, manifests) puis vérifie
#   ./scripts/k8s-local.sh etat         montre les pods, services et volumes
#   ./scripts/k8s-local.sh journaux     suit les journaux de l'API
#   ./scripts/k8s-local.sh arreter      supprime le cluster ET ses données
#
# Prérequis : Docker, kind et kubectl (voir docs/deploiement.md, section 9), et les
# ports 3000 et 5173 LIBRES (arrêter les serveurs de développement).
# Accès ensuite : site http://localhost:5173, API http://localhost:3000/api/v1.
# Les manifests sont dans k8s/ ; chaque fichier est commenté.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
CLUSTER="onthepitch"
K=(kubectl --context "kind-$CLUSTER" -n onthepitch)

exiger() {
  command -v "$1" >/dev/null || { echo "ERREUR : '$1' introuvable. Voir docs/deploiement.md, section 9 (installation de kind et kubectl)." >&2; exit 1; }
}

case "${1:-demarrer}" in
  etat)
    "${K[@]}" get pods,svc,pvc -o wide
    ;;

  journaux)
    "${K[@]}" logs -f deployment/api
    ;;

  arreter)
    exiger kind
    kind delete cluster --name "$CLUSTER"
    ;;

  demarrer)
    exiger docker; exiger kind; exiger kubectl

    # 1. Cluster (créé une seule fois ; les ports 3000/5173 doivent être libres).
    if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
      for port in 3000 5173; do
        if ss -ltn "sport = :$port" | grep -q LISTEN; then
          echo "ERREUR : le port $port est occupé (serveur de développement ?). Libérez-le puis relancez." >&2
          exit 1
        fi
      done
      echo "==> Création du cluster Kubernetes local"
      kind create cluster --config "$RACINE/k8s/local/kind-config.yaml"
    fi

    # 2. Images : construites sur place puis CHARGÉES dans le cluster (pas de registre).
    echo "==> Construction et chargement des images"
    docker build -q -t onthepitch-api:local "$RACINE/backend"
    docker build -q -t onthepitch-client:local "$RACINE/frontend"
    kind load docker-image onthepitch-api:local onthepitch-client:local --name "$CLUSTER"

    # 3. Espace de noms, puis secrets — créés UNE FOIS, jamais versionnés. Le mot de
    #    passe de la base est figé à la création du volume : ne pas le régénérer.
    kubectl --context "kind-$CLUSTER" apply -f "$RACINE/k8s/00-namespace.yaml"
    if ! "${K[@]}" get secret onthepitch-secrets >/dev/null 2>&1; then
      echo "==> Création des secrets (aléatoires, uniquement dans le cluster)"
      "${K[@]}" create secret generic onthepitch-secrets \
        --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
        --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
    fi

    # 4. Manifests.
    echo "==> Application des manifests"
    "${K[@]}" apply -f "$RACINE/k8s/"

    # Les images gardent le même nom (:local) : « apply » ne relance rien si seul le
    # code a changé. On relance donc explicitement l'API et le site.
    "${K[@]}" rollout restart deployment/api deployment/client >/dev/null

    # 5. Attente que tout soit prêt, puis test de fumée.
    echo "==> Attente des composants"
    "${K[@]}" rollout status statefulset/db --timeout=180s
    "${K[@]}" rollout status deployment/api --timeout=240s
    "${K[@]}" rollout status deployment/client --timeout=120s
    "$RACINE/scripts/smoke-test.sh"
    echo "Kubernetes local prêt : site http://localhost:5173 — API http://localhost:3000/api/v1"
    ;;

  *)
    echo "Usage : $0 [demarrer|etat|journaux|arreter]" >&2
    exit 1
    ;;
esac
