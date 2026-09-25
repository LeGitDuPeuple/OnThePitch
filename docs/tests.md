# Tests — environnements et procédure d'exécution

Ce document définit **où** et **comment** l'application est testée, à chaque
niveau : unitaire, intégration, système, acceptation. Pour déployer
l'application elle-même, voir [`deploiement.md`](deploiement.md).

## 1. Les niveaux de test

| Niveau | Ce qui est vérifié | Outil | Nombre | Base de données | Durée |
|---|---|---|---|---|---|
| **Unitaire / Service** | Les règles métier (couche Service), isolées | Jest | 129 | Aucune (doubles en mémoire) | ≈ 20 s |
| **Intégration** | L'API réelle contre la vraie base : contraintes SQL, transactions, cookies, codes HTTP | Playwright (mode API) | 14 | PostgreSQL + PostGIS réels | ≈ 40 s |
| **Système (bout en bout)** | Parcours complets à travers l'interface, dans un vrai navigateur | Playwright + Chrome | 15 | PostgreSQL + PostGIS réels | ≈ 2 min |
| **Acceptation** | Le comportement attendu par le client, cas par cas | Cahier de recette (manuel) | 75 cas | Environnement de démonstration | — |
| **Performance** | La recherche géolocalisée tient l'objectif | Mesure ponctuelle | — | 1 000 événements | — |
| **Sécurité** | Dépendances vulnérables | `npm audit` | 3 projets | — | ≈ 10 s |

**Pourquoi ces niveaux et pas un seul** — chacun voit ce que les autres ne voient pas :

- Jest est rapide et précis, mais avec des doubles en mémoire il ne voit ni les
  contraintes SQL, ni le comportement réel des transactions.
- L'intégration a ce qu'il manque à Jest, sans le coût d'un navigateur.
  *Exemple réel :* c'est ce niveau qui a révélé que, sous forte concurrence
  d'inscriptions, des requêtes renvoyaient une erreur 500 (conflit de
  sérialisation PostgreSQL non rejoué) — invisible pour Jest comme pour les E2E.
- Les E2E vérifient ce que voit l'utilisateur (boutons, messages, navigation).
- La recette valide que c'est **ce qui était demandé**.

## 2. Les environnements de test

| Environnement | Où | Données | Emails | Géocodage | Utilisé pour |
|---|---|---|---|---|---|
| **Poste de développement** | Machine du développeur, `npm run dev` (back sur :3000, front sur :5173) + base Docker `onthepitch-db` | Base de dev, qui s'accumule | SMTP réel **ou** Ethereal selon `.env` | API Adresse réelle | Jest ; recette manuelle ; intégration/E2E ponctuelles |
| **Pile jetable de test** | Conteneurs Docker `onthepitch-ci-*` créés par `scripts/e2e.sh` | **Base vide à chaque exécution**, détruite ensuite | Ethereal (SMTP non configuré) | API Adresse réelle | Intégration + E2E, en local ou en CI |
| **CI (Jenkins)** | Conteneur Jenkins (image `ci/jenkins/`) pilotant le Docker de l'hôte | Pile jetable ci-dessus | Ethereal | API Adresse réelle | Push : Jest. Nuit : tout |
| **Kubernetes local** | `./scripts/k8s-local.sh` : cluster `kind`, base neuve, secrets aléatoires | Base neuve ; supprimée avec le cluster | Ethereal (SMTP non configuré) | API Adresse réelle | Vérifier un déploiement « comme en production » ; la suite complète (29 tests) y passe |
| **Démonstration** | `./scripts/deployer-dev.sh` | Base de démo | selon `.env` | API Adresse réelle | Présentation, recette d'acceptation |

Règles de cet environnement de test :

- **Aucun mock du système.** Les tests d'intégration et E2E parlent à la vraie
  application et à la vraie base — la couche Service est déjà isolée par Jest.
- **Le géocodage n'est pas simulé** : chaque création d'événement appelle la vraie
  API Adresse. Un `503` ponctuel est possible ; les utilitaires de test réessayent
  avec un délai croissant. Un échec isolé de la nuit peut donc venir de là.
- **La pile jetable est isolée du poste de dev** (noms, volume et ports distincts,
  aucun port de base exposé) : la lancer ne touche jamais aux données de dev.
- **Aucun secret** requis pour la CI : mot de passe de base et clé JWT sont tirés au
  hasard à chaque exécution.
- Les ports **3000 et 5173 doivent être libres** pour la pile jetable (l'URL de l'API
  est figée dans le build du front et l'origine CORS est `localhost:5173`) :
  arrêter les serveurs de dev avant de lancer `e2e.sh`.

## 3. Procédure d'exécution

### 3.1 Tests unitaires — sans base, sans Docker

```bash
cd backend
npm ci
npx prisma generate --config prisma7.config.ts    # une fois
npm test                                          # attendu : 12 suites, 129 tests passés
npm run typecheck:tests                           # typage strict des tests
```

Ou tout d'un coup, depuis la racine (dépendances + compilation + Jest + build du
front, **environnement vierge accepté**) :

```bash
./scripts/verifier.sh          # ≈ 1 min 20 ; code de sortie 0 = tout est vert
```

### 3.2 Intégration + bout en bout — pile jetable complète

```bash
# ports 3000 et 5173 libres, Docker et Google Chrome installés
./scripts/e2e.sh
```

Le script démarre la pile jetable, attend qu'elle réponde (`smoke-test.sh`), lance
les **deux** projets Playwright (`integration` puis `chromium`), puis détruit
conteneurs et volume, même en cas d'échec.

**Résultat attendu** : `29 passed` (14 intégration + 15 E2E), ≈ 2 min à chaud,
≈ 4-5 min au premier lancement (construction des images).
Rapports : `e2e/resultats/playwright-junit.xml` (résumé) et
`e2e/playwright-report/index.html` (détail, captures et traces des échecs).

### 3.3 Contre une application déjà démarrée (mode développement)

Plus rapide pour itérer : l'application tourne (`npm run dev`), on ne lance que les tests.

```bash
# 1. Backend de dev avec un plafond de tentatives relevé (voir remarque)
cd backend && LIMITE_TENTATIVES=1000 npm run dev
# 2. Front de dev, dans un autre terminal
cd frontend && npm run dev
# 3. Tests, dans un troisième
cd e2e && npm ci
npx playwright test --project=integration      # intégration seule
npx playwright test --project=chromium         # E2E seuls
npx playwright test --headed                   # voir le navigateur
```

> **Remarque limiteur.** Ces tests provoquent volontairement des échecs de
> connexion (mauvais mot de passe, mauvais code 2FA), tous comptés sur la même IP.
> Avec le plafond par défaut (10), le backend de dev les bloque (`429`) — c'est
> pourquoi il est démarré avec `LIMITE_TENTATIVES=1000`. La pile jetable de
> `e2e.sh` le fait déjà toute seule.

### 3.4 Audit de sécurité des dépendances

```bash
./scripts/audit.sh          # rapports dans resultats/audit/ ; code 1 si vulnérabilité « high »
```

### 3.5 Test de fumée d'un déploiement

```bash
./scripts/smoke-test.sh     # 3 lignes OK attendues
```

## 4. Intégration continue (Jenkins)

Le `Jenkinsfile` appelle les scripts ci-dessus ; il ne contient aucune logique.

| Déclencheur | Étapes | Durée |
|---|---|---|
| **Push** (interrogation du dépôt toutes les 5 min ; webhook GitHub en cible) | Vérification : compilation, Jest, build du front | ≈ 1 min 30 |
| **Chaque nuit** (~ 2 h) | Vérification + **Audit de sécurité** + **Intégration/E2E** | ≈ 5-12 min |
| **Lancement manuel** avec `LANCER_E2E` | Idem la nuit | idem |

Lecture des résultats dans Jenkins :

- **Vert** : tout passe. **Rouge** : une étape a échoué (voir l'étape en rouge).
- **Jaune (instable)** : les tests passent mais l'audit a trouvé une vulnérabilité
  « high ». Ce n'est volontairement pas un échec : l'alerte doit être **vue et
  traitée** (voir [`veille.md`](veille.md)), sans bloquer pour une faille sans
  correctif disponible.
- Les rapports Playwright et d'audit sont archivés sur chaque build.

**Jenkins de démonstration** (pour valider ou montrer le pipeline, sans serveur) :

```bash
./scripts/jenkins-local.sh            # construit l'image et démarre → http://localhost:8085
./scripts/jenkins-local.sh lancer     # 1re fois : build simple ; 2e fois : build complet (E2E)
./scripts/jenkins-local.sh arreter
```

Accès `admin` / mot de passe de démonstration affiché par le script. L'image
`ci/jenkins/Dockerfile` **définit l'environnement de la CI** : Node 24, client
Docker + Compose, Google Chrome, Git. Elle lit le dépôt local (branche `main`,
**ce qui est commité**). **Arrêter Jenkins après usage** : son passage de 2 h
lancerait les E2E sur les ports de développement.

*Validation réalisée :* 3 builds dans ce Jenkins — échec attendu puis corrigé
(dépôt local refusé par défaut), succès de l'étape Vérification, et build complet
avec 129 tests Jest, 29 tests Playwright et audit (jaune), pile nettoyée.

## 5. Acceptation client — le cahier de recette

Document séparé (page interactive, 75 cas, cases cochables conservées dans le
navigateur), tenu par le porteur de projet.

**Structure** : 8 sections — A Authentification (11), B Événements (17),
C Recherche géolocalisée (12), D Inscriptions (11), E Présences / QR (8),
F Modération (5), G Interface et navigation (6), H Sécurité (5). Chaque cas donne
un identifiant (`AUTH-01`, `EVT-17`...), les étapes et le **résultat attendu**.
Les étiquettes *Jest* (règle déjà couverte automatiquement) et *Critique*
(bloque une fonctionnalité cœur) orientent la priorité.

**Procédure**

1. Déployer l'environnement de démonstration (`./scripts/deployer-dev.sh`).
2. Créer un compte joueur et un compte administrateur (cf. `deploiement.md`, § 4).
3. Dérouler les cas section par section, dans l'ordre. Cocher un cas **uniquement**
   si le résultat observé correspond au résultat attendu.
4. Tout écart : noter l'identifiant du cas, le résultat observé et le résultat attendu ;
   corriger ; **rejouer le cas et ceux de la même section**.
5. Recette terminée quand les 75 cas sont cochés et qu'aucun cas *Critique* ou
   *Sécurité* n'est en échec. Rejouer la recette (ou au moins les sections
   touchées) après toute modification du code concerné.

**Limite connue.** Le cahier date du 20/09/2026 : il ne couvre pas encore les
notifications, la notation des organisateurs, la gestion du compte / double
authentification, ni le tableau de bord d'administration étendu (statistiques,
liste des événements). Ces fonctionnalités sont couvertes par les tests
Jest, d'intégration et E2E, mais leur **recette d'acceptation reste à écrire**.

## 6. Performance

Objectif du cahier des charges : la recherche géolocalisée répond en moins de
500 ms sur 1 000 événements. Mesuré le 24/09/2026 : **11 à 55 ms**
(1 000 événements insérés directement en base, tous dans le rayon de recherche
pour forcer le tri de ~1 000 lignes, rayons de 60 et 100 km). Méthode et
détails : `CLAUDE.md`, section « Recherche géolocalisée ».

## 7. Ce que les tests ne couvrent pas (assumé)

- **Lecture réelle d'un QR par une caméra** : non simulable ; repose sur le même
  point d'accès que le marquage manuel, lui testé.
- **Envoi d'email réel** : les tests utilisent Ethereal ; l'envoi SMTP réel a été
  vérifié à la main.
- **Navigateurs autres que Chrome**, et **mobiles réels** : le responsive est
  vérifié par redimensionnement, pas sur appareil.
- **Charge en conditions réelles** (utilisateurs simultanés) : la seule mesure de
  perf est celle de la recherche.
