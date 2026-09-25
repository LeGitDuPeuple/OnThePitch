# Procédure de déploiement — OnThePitch

Ce document explique comment déployer l'application, la vérifier, la maintenir et
revenir en arrière. Les commandes sont à copier telles quelles ; chaque script
cité est commenté en tête de fichier.

> **Périmètre.** La procédure est écrite et **exécutée pour un environnement de
> développement / démonstration** (une machine avec Docker). Le passage en
> production (HTTPS, Kubernetes, AWS) est décrit en section 9 comme cible, mais
> n'a **pas** été réalisé.

## 1. Vue d'ensemble

```
   navigateur ── http://localhost:5173 ──►  client   (nginx : fichiers React)
       │
       └──── http://localhost:3000/api/v1 ─►  api      (Node 24 + Express + Prisma)
                                                 │
                                                 └─►  db  (PostgreSQL 16 + PostGIS)
```

Trois conteneurs, définis dans `docker-compose.yml` :

| Service | Image | Rôle | Port hôte |
|---|---|---|---|
| `db` | `postgis/postgis:16-3.4` | Base de données (volume `db_data`) | 5432 |
| `api` | construite depuis `backend/Dockerfile` | API REST ; applique les migrations au démarrage | 3000 |
| `client` | construite depuis `frontend/Dockerfile` | Site React servi par nginx (repli sur `index.html` pour les routes) | 5173 |

L'API appelle un service externe : l'**API Adresse** du gouvernement
(`api-adresse.data.gouv.fr`) pour géocoder les adresses. Elle doit être
joignable depuis le conteneur `api`.

## 2. Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Docker | récent (testé : 29) | `docker --version` |
| Docker Compose | v2 (testé : 2.40) | `docker compose version` |
| Git | — | `git --version` |
| Accès Internet sortant | pour l'API Adresse et le téléchargement des images | — |

Ports **3000**, **5173** et **5432** libres sur la machine.

## 3. Configuration

Toute la configuration passe par des variables d'environnement, lues dans un
fichier `.env` **à la racine** du dépôt (jamais versionné : `.gitignore`).

```bash
cp .env.example .env
# puis renseigner au minimum POSTGRES_PASSWORD et JWT_SECRET
openssl rand -hex 32     # bon générateur pour JWT_SECRET
```

| Variable | Obligatoire | Rôle |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER` | oui | Nom de la base et de l'utilisateur (défauts dans `.env.example`) |
| `POSTGRES_PASSWORD` | **oui** | Mot de passe de la base |
| `JWT_SECRET` | **oui** | Clé de signature des sessions et des jetons (2FA, QR de présence). Si elle change, toutes les sessions sont invalidées |
| `API_ADRESSE_URL` | oui | URL de l'API de géocodage |
| `DATABASE_URL` | non en conteneur | Utilisée pour le développement local ; dans Docker, `docker-compose.yml` la réécrit vers `db:5432` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | non | Envoi réel des emails de notification. **S'il en manque une, l'API bascule sur un compte de test Ethereal** (aucun email réel envoyé) |
| `APP_NAME` | non | Nom affiché dans l'application d'authentification (2FA). Défaut : `OnThePitch` |
| `TRUST_PROXY` | non | Nombre de proxys devant l'API (voir section 8). À poser **derrière un proxy** |
| `LIMITE_TENTATIVES` | non | Échecs tolérés par IP et par 15 min sur la connexion (défaut 10) |

## 4. Déployer (développement / démonstration)

```bash
./scripts/deployer-dev.sh
```

Le script : (1) construit les images `api` et `client`, (2) démarre les trois
conteneurs — l'`api` attend que la base soit saine, puis applique les
**migrations Prisma** toute seule — (3) lance le **test de fumée**
(`scripts/smoke-test.sh`). Il est **idempotent** : le relancer met la pile à jour.

**Résultat attendu** (≈ 15 s si les images sont en cache, quelques minutes au
premier lancement) :

```
OK    : API — route de santé
OK    : API + base — recherche géolocalisée
OK    : Front — page d'accueil
Test de fumée réussi.
```

Accès : site sur <http://localhost:5173>, API sur <http://localhost:3000/api/v1>.

**Comptes de démonstration.** Une base neuve est vide. Créer un compte depuis
`/inscription`. Un compte administrateur ne s'obtient pas par l'interface : passer
le rôle à `administrateur` en base :

```bash
docker exec onthepitch-db psql -U onthepitch -d onthepitch \
  -c "UPDATE utilisateur SET role='administrateur' WHERE email='admin@example.com';"
```

## 5. Vérifier un déploiement

| Vérification | Commande | Attendu |
|---|---|---|
| Test de fumée complet | `./scripts/smoke-test.sh` | 3 lignes `OK` |
| État des conteneurs | `docker compose ps` | `db` *healthy*, `api` et `client` *Up* |
| Journaux de l'API | `docker compose logs -f api` | « API démarrée sur http://localhost:3000 » |
| Migrations appliquées | `docker compose logs api \| grep -i migrat` | « All migrations have been successfully applied » ou « No pending migrations » |

Pour aller plus loin (tests automatiques contre l'application déployée) :
voir [`tests.md`](tests.md).

## 6. Mettre à jour

```bash
git pull
./scripts/deployer-dev.sh
```

Les images sont reconstruites, les nouvelles migrations appliquées au démarrage
de l'`api`. Les données (volume `db_data`) sont conservées.

## 7. Retour arrière

1. **Repérer la version saine** : `git log --oneline`.
2. **Revenir au code** : `git checkout <commit>` puis `./scripts/deployer-dev.sh`.
3. **Attention aux migrations** : Prisma n'a pas de « retour » automatique. Les
   migrations du projet sont **additives** (nouvelles tables ou colonnes avec
   valeur par défaut) : l'ancien code continue de fonctionner sur le schéma
   plus récent. Si une migration devait être annulée, restaurer la sauvegarde
   prise avant la mise à jour :

```bash
# Avant une mise à jour risquée : sauvegarde
docker exec onthepitch-db pg_dump -U onthepitch onthepitch > sauvegarde-$(date +%F).sql

# Restauration (base vide ou recréée)
docker exec -i onthepitch-db psql -U onthepitch onthepitch < sauvegarde-AAAA-MM-JJ.sql
```

## 8. Exploitation — points d'attention

| Sujet | Ce qu'il faut savoir |
|---|---|
| **Horloge du serveur** | La double authentification (TOTP) tolère ±30 s. Si l'horloge dérive (NTP absent), les codes sont refusés. Vérifier `timedatectl` |
| **Limiteur de tentatives** | Compteur **en mémoire, par IP et par instance** : un redémarrage le remet à zéro ; avec plusieurs instances de l'API, chacune compte à part. Le limiter partagé (Redis) est une évolution possible |
| **Derrière un proxy** | Sans `TRUST_PROXY=1`, toutes les requêtes semblent venir de l'IP du proxy : **une seule personne en échec bloquerait tout le monde**. À poser dès qu'un nginx/ingress est devant l'API |
| **Tâche périodique** | L'API clôture d'elle-même les événements oubliés (3 h après leur fin), toutes les 30 min, sans cron externe (`server.ts`) |
| **Emails** | Sans SMTP configuré : compte Ethereal, aperçu web uniquement. Avec SMTP réel : les notifications partent réellement — ne pas le configurer sur un environnement de test |
| **Secrets** | `.env` n'est jamais versionné. Régénérer `JWT_SECRET` invalide les sessions ; changer `POSTGRES_PASSWORD` après création du volume exige de recréer la base |
| **Images de base** | `node:24-slim` (Debian, pas Alpine : `bcrypt` compile du code natif) et `postgis/postgis:16-3.4`. Les suivre — voir [`veille.md`](veille.md) |

Dépannage courant :

| Symptôme | Cause probable | Action |
|---|---|---|
| `port is already allocated` | 3000/5173/5432 occupé (serveur de dev, autre pile) | Arrêter l'occupant : `ss -ltnp \| grep :3000` |
| `api` redémarre en boucle | `.env` incomplet ou base pas prête | `docker compose logs api` |
| Erreur `429 Trop de tentatives` | Plafond d'échecs de connexion atteint | Attendre 15 min, ou redémarrer l'`api` |
| Création d'événement en `503` | API Adresse indisponible ou trop sollicitée | Réessayer ; pas d'erreur côté application |
| Codes 2FA toujours refusés | Horloge du serveur ou du téléphone décalée | Synchroniser l'horloge |

## 9. Passage en production — cible (non réalisé)

Ce qui changerait, et pourquoi. C'est la feuille de route, pas un déploiement fait.

| Sujet | Développement (actuel) | Production (cible) |
|---|---|---|
| **HTTPS** | Non | Obligatoire : la caméra (scan QR) n'est autorisée qu'en HTTPS hors `localhost`, et le cookie de session passe en `secure` dès `NODE_ENV=production`. Terminaison TLS par un reverse proxy / ingress |
| **Secrets** | Fichier `.env` | Gestionnaire de secrets (Secrets Kubernetes, AWS Secrets Manager) — jamais dans l'image ni le dépôt |
| **Base** | Conteneur + volume local | Base managée avec PostGIS, sauvegardes automatiques, ou `StatefulSet` + volume persistant |
| **Orchestration** | `docker compose` | Kubernetes : un *Deployment* + *Service* par composant (`api`, `client`), migrations dans un *Job* ou *initContainer*, sonde de disponibilité sur `/api/v1/sante` |
| **Images** | Construites sur place | Construites par la CI, poussées dans un registre, déployées **par version** (étiquette = commit) |
| **Proxy / IP** | Accès direct | `TRUST_PROXY=1` ; limiteur de tentatives partagé (Redis) pour plusieurs réplicas |
| **CI/CD** | Jenkins de démonstration en local (`scripts/jenkins-local.sh`) | Jenkins sur un serveur (ex. EC2), webhook GitHub au lieu de l'interrogation du dépôt, déploiement automatique après une CI verte |
| **Supervision** | `docker compose logs` | Agrégation de journaux, alertes sur l'échec du passage de nuit |

Les scripts et le `Jenkinsfile` actuels sont écrits pour se prêter à ce passage :
chaque étape est un script autonome, la CI n'a besoin d'aucun secret, et les
migrations s'appliquent au démarrage.
