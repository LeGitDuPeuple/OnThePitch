# OnThePitch

Plateforme web pour organiser et rejoindre des événements de football amateur, avec
une **recherche géolocalisée par rayon** (PostGIS). Projet de certification CDA.

**Stack** : React + TypeScript (front), Node 24 + Express + TypeScript (API),
PostgreSQL + PostGIS via Prisma, Docker, Jest + Playwright, Jenkins.

## Démarrer en 3 commandes

```bash
cp .env.example .env          # renseigner POSTGRES_PASSWORD et JWT_SECRET (openssl rand -hex 32)
./scripts/deployer-dev.sh     # construit, démarre, applique les migrations, vérifie
# → site : http://localhost:5173    API : http://localhost:3000/api/v1
```

## Documentation

| Document | Contenu |
|---|---|
| [`docs/deploiement.md`](docs/deploiement.md) | Procédure de déploiement (Docker Compose et Kubernetes local), configuration, mise à jour, retour arrière, exploitation |
| [`docs/tests.md`](docs/tests.md) | Environnements de test, procédure d'exécution (unitaire, intégration, système, acceptation), CI Jenkins |
| [`docs/veille.md`](docs/veille.md) | Veille technologique et sécurité : dispositif, processus, registre |
| [`CLAUDE.md`](CLAUDE.md) | Spécifications, décisions d'architecture et journal d'avancement détaillé |

## Scripts (`scripts/`)

| Script | Rôle |
|---|---|
| `deployer-dev.sh` | Déploiement de démonstration (Docker Compose) |
| `smoke-test.sh` | Vérifie que la pile répond (API, base, front) |
| `verifier.sh` | Compilation + tests Jest + build du front (sans base) |
| `e2e.sh` | Pile jetable → tests d'intégration et de bout en bout → nettoyage |
| `audit.sh` | Audit de sécurité des dépendances |
| `k8s-local.sh` | Kubernetes en local (`kind`) : déploiement « comme en production, sans serveur » |
| `jenkins-local.sh` | Jenkins de démonstration en local |
