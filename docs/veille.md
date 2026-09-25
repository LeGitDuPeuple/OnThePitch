# Veille technologique et sécurité — OnThePitch

Ce document décrit **comment** on suit les évolutions de la stack et les failles de
sécurité qui touchent le déploiement de l'application, **qui** fait quoi, et **ce
qu'on décide** quand une alerte tombe. La dernière section est le registre des
alertes réellement traitées.

## 1. Ce qu'on surveille, et pourquoi

| Composant | Version | Pourquoi le surveiller |
|---|---|---|
| Node.js | 24 (LTS) | Exécute l'API ; failles du moteur et de ses modules |
| Dépendances npm (back, front, e2e) | voir `package.json` | Chaîne d'approvisionnement : la majorité des failles arrivent par là |
| Prisma + adaptateur `pg` | 7.x | ORM ; son comportement a changé entre versions majeures (voir registre) |
| PostgreSQL + PostGIS | 16 / 3.4 | Données ; correctifs de sécurité réguliers |
| Images Docker (`node:24-slim`, `postgis/postgis`) | — | Le système sous l'application : bibliothèques système, OpenSSL |
| Jenkins et ses plugins | LTS | Une CI compromise compromet la livraison |
| Bibliothèques de sécurité (`bcrypt`, `jsonwebtoken`, `otplib`, `helmet`) | — | Mots de passe, sessions, 2FA : toute faille compte double |

## 2. Le dispositif : sources, outils, fréquence

| Source | Ce qu'on y lit | Fréquence | Outil | Automatique ? |
|---|---|---|---|---|
| **`npm audit`** | Vulnérabilités connues des dépendances de production | Chaque nuit | `scripts/audit.sh` dans Jenkins (build **jaune** si « high ») | **Oui** |
| **Dependabot** (GitHub) | Alertes de sécurité + demandes de fusion de mises à jour (npm, Docker) | Alertes : immédiat. Mises à jour : chaque lundi | `.github/dependabot.yml` | **Oui** |
| **GitHub Advisory Database** | Détail d'une alerte (versions touchées/corrigées) | À chaque alerte | github.com/advisories | Non |
| **Bulletins de sécurité Node.js** | Failles du moteur et correctifs | Mensuelle | nodejs.org/en/blog/vulnerability | Non |
| **Notes de version Prisma** | Ruptures de compatibilité, correctifs | À chaque mise à jour de Prisma | github.com/prisma/prisma/releases | Non |
| **Avis de sécurité PostgreSQL / PostGIS** | Failles de la base | Trimestrielle | postgresql.org/support/security | Non |
| **Avis de sécurité Jenkins** | Failles de Jenkins et de ses plugins | Mensuelle | jenkins.io/security/advisories | Non |
| **OWASP Top 10** | Familles de risques web (référence de la recette « Sécurité ») | À chaque nouvelle édition | owasp.org/Top10 | Non |
| **CERT-FR (ANSSI)** | Alertes et avis de sécurité en français, vulnérabilités critiques | Hebdomadaire | cert.ssi.gouv.fr | Non |

**Ce que l'automatique garantit** : aucune vulnérabilité connue d'une dépendance ne
reste invisible plus de 24 h (audit de nuit) ; aucune mise à jour disponible ne
reste invisible plus d'une semaine (Dependabot). **Ce qui reste humain** : lire les
bulletins hors dépendances (moteur, base, Jenkins) et juger de la pertinence.

**Rythme de revue.** Une revue hebdomadaire (15 min, le lundi, après les demandes
de fusion Dependabot) : build de nuit, demandes de fusion ouvertes, alertes GitHub.
Une revue mensuelle des bulletins Node.js, Jenkins et PostgreSQL.

## 3. Processus quand une alerte tombe

1. **Qualifier.** Gravité (score CVSS) ; le composant est-il **utilisé à l'exécution**
   ou seulement un outil de développement ? Notre usage rend-il la faille
   exploitable ?
2. **Chercher le correctif.** Version corrigée existante ? Est-ce une mise à jour
   mineure ou une rupture de compatibilité (version majeure) ?
3. **Décider** :

   | Décision | Quand |
   |---|---|
   | **Corriger** | Correctif compatible existe → mise à jour, CI verte, déploiement |
   | **Atténuer** | Pas de correctif mais contournement (configuration, désactivation d'une fonction) |
   | **Accepter, documenter, réexaminer** | Pas exploitable dans notre usage, ou correctif cassant : consigné avec **date de réexamen** |

4. **Délais visés.** Critique **utilisée à l'exécution** : 48 h. « High » : 1 semaine.
   Autres : à la prochaine maintenance.
5. **Tracer** dans le registre ci-dessous (et `CLAUDE.md`), **vérifier** que la CI
   repasse au vert, ou que le build jaune est **expliqué**.

Un build jaune n'est jamais ignoré : il est soit corrigé, soit consigné au registre
avec sa justification.

## 4. Registre des alertes et évolutions traitées

| Date | Source | Sujet | Analyse | Décision |
|---|---|---|---|---|
| 24/09/2026 | Dependabot + `npm audit` | **`mysql2` ≤ 3.23.0** — GHSA-3f6p-5ww8-9rcr (rétrogradation du plugin d'authentification, fuite d'identifiants en clair) et GHSA-rgwj-5xj2-c3m3 (déni de service par décompression) — sévérité *high* | Dépendance **transitive de l'outillage Prisma**, non utilisée à l'exécution : la base est PostgreSQL, aucune connexion MySQL n'est ouverte. Le correctif proposé (`npm audit fix --force`) **rétrograde Prisma en 6.19.3** : rupture de compatibilité (Prisma 7 + adaptateur `pg`) | **Accepter, documenter, réexaminer** à chaque version de Prisma. Le build de nuit reste jaune tant que c'est ouvert. Ne pas forcer |
| 24/09/2026 | Lecture de la doc / migration | **`otplib` 12 → 13** : l'API a été entièrement refaite (fonctions au lieu de l'objet `authenticator`) | Le code d'un projet précédent, écrit pour la v12, n'était pas réutilisable tel quel | Code écrit pour la v13, isolé derrière une interface (`TotpInterface`) : une future rupture ne touchera qu'un fichier |
| 24/09/2026 | Revue de code d'un projet précédent | **Vérification 2FA fondée sur un identifiant fourni par le client** (contournement possible du mot de passe) | Faille de conception, pas de dépendance | Non reprise : jeton temporaire signé de 5 minutes ; jeton temporaire refusé comme session |
| 24/09/2026 | Sortie d'une dépendance | **`dotenv` 17** affiche des messages promotionnels dans la console au démarrage | Sans effet sur la sécurité ; vérifié dans le code du paquet (astuces intégrées) | Aucune action ; rappel de lire ce que les dépendances écrivent |
| 25/09/2026 | Test d'intégration | **Prisma 7 + adaptateur `pg`** : un conflit de sérialisation PostgreSQL (`40001`) remonte sous forme de `DriverAdapterError`, et non plus de l'erreur Prisma `P2034` que le code attendait | Sous forte concurrence d'inscriptions, la reprise ne se déclenchait pas : réponses `500` (la règle métier restait sauve, jamais de sur-réservation) | Reconnaissance des deux formes, 12 tentatives avec délai aléatoire, `503` propre en dernier recours ; validé sur 10 rondes de 12 inscriptions simultanées |
| 18/09/2026 | Recette (SEC-05) | **Type MIME d'un fichier téléversé falsifiable** (l'extension et le `Content-Type` sont choisis par le client) | Un exécutable renommé en `.jpg` était accepté | Vérification des premiers octets du fichier (signatures jpeg/png/webp) |
| 15/09/2026 | Test | **En-tête `Cross-Origin-Resource-Policy: same-origin`** posé par défaut par `helmet` | Bloquait silencieusement l'affichage des photos entre le front et l'API | Réglé sur `cross-origin` pour cette seule ressource publique |

## 5. Limites assumées

- La veille « hors dépendances » (Node.js, PostgreSQL, Jenkins, OWASP, CERT-FR) reste
  **manuelle** : c'est une habitude à tenir, pas un outil.
- Les images Docker de base sont suivies par Dependabot, mais **aucune analyse
  d'image** (type Trivy) n'est branchée : évolution possible dans le passage de nuit.
- Le registre est tenu à la main ; il reflète ce qui a été traité, pas un flux
  exhaustif de tout ce qui existe.
