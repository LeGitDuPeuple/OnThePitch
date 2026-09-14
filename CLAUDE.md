# OnThePitch — Spécifications projet

## Contexte

Plateforme web d'organisation d'événements de football amicaux entre joueurs amateurs.
Projet de certification CDA (Concepteur Développeur d'Applications).

**Le problème résolu :** adulte, il devient difficile de trouver des gens avec qui jouer
en dehors de son cercle. OnThePitch permet de publier et trouver des événements à proximité.

**Fonctionnalité différenciante :** la recherche géolocalisée par rayon (PostGIS).
C'est le cœur du produit, à traiter en priorité après le socle technique.

**Vocabulaire :** on parle d'**événements**, pas de "matchs", partout dans le code,
les commentaires et les messages utilisateur.

---

## Règle générale : la simplicité prime

Les principes ci-dessous s'appliquent **là où ils changent quelque chose**. Une couche
qui ne fait que transmettre des données à la suivante est une couche à supprimer, pas
une preuve de rigueur. Un jury sanctionne une architecture surdimensionnée aussi
sûrement qu'une architecture absente.

Devant un choix entre deux solutions qui répondent au besoin, prendre la plus simple.

---

## Suivi d'avancement

À mettre à jour à la fin de chaque session. Cocher uniquement ce qui est réellement
terminé et testé.

### Socle
- [ ] `docker-compose.yml` fonctionnel (db + api + client) — seul `db` existe pour l'instant,
      `api`/`client` pas encore conteneurisés (pas de Dockerfile, `frontend/` pas encore amorcé)
- [x] Extension PostGIS active + index GIST (via migration Prisma, pas `init.sql`)
- [x] Serveur Express qui démarre et répond sur une route de santé
- [x] Structure de dossiers en place (controllers / services / repositories)
- [x] `container.ts` (composition des dépendances)
- [x] Middleware d'erreurs centralisé
- [x] `.env.example` versionné, `.env` ignoré

### Authentification
- [x] Inscription avec hachage bcrypt — testé (201, doublon d'email → 409)
- [x] Connexion avec émission du JWT — testé (200, jeton posé en cookie httpOnly,
      jamais dans le corps JSON — voir section 2). `POST /auth/deconnexion` testé
      (efface le cookie, `GET /auth/profil` échoue ensuite)
- [x] Middleware `authentifier` — testé sur `POST/DELETE /evenements` (401 sans cookie)
- [x] Middleware `verifierRole` — testé sur `POST /evenements` (rôle `joueur` requis)
- [x] Schémas Zod de validation partagés — testé (400 + détail du champ en erreur)

### Événements
- [x] `GeocodageService` (API Adresse) opérationnel — testé contre la vraie API
      (adresse valide résolue, adresse introuvable → 400 explicite)
- [x] Création d'événement avec géocodage et refus si adresse non résolue — testé
      (201 adresse valide, 400 adresse introuvable, 400 date de début passée)
- [x] Annulation (soft delete) — testée (204 par l'organisateur, 403 pour un autre
      joueur, ligne conservée en base avec `date_desactivation`).
- [x] Modification (édition) d'un événement existant — `PATCH /evenements/:id`,
      réservé à l'organisateur. Titre, description, places, dates, niveau requis ;
      l'adresse n'est volontairement pas modifiable ici (redéclencherait un
      géocodage). Testée (200, 403 non-organisateur, 400 corps vide/date invalide,
      409 si déjà terminé, refus de réduire les places sous le nombre d'inscrits).
- [x] Consultation d'un événement (détail) — testée (200, 404 si inexistant ou
      désactivé), inclut le lieu. Liste des inscrits exposée séparément via
      `GET /evenements/:id/inscriptions` (accessible sans authentification, comme
      la consultation de l'événement), testée.
- [x] Niveau requis (`niveau_event`/`requiert`, prévu au MCD, jamais câblé jusqu'ici) —
      testé (valeur par défaut `tous_niveaux`, valeur explicite, 400 si invalide),
      exposé sur la création, la consultation et la recherche
- [x] Photo du lieu — testée (upload multipart par l'organisateur, 401/403/400,
      récupération avec octets identiques). Écart au MCD documenté (section `lieu`)

### Recherche géolocalisée
- [x] Requête PostGIS `ST_DWithin` + `ST_Distance` dans le repository — testée contre
      la vraie base (résultat trié par distance, zone vide → liste vide, pas une erreur)
- [x] Index GIST créé
- [x] Règles métier du service (rayon par défaut, conversions) — testées via
      `GET /evenements/recherche` (défaut 10 km, refus > 100 km)
- [x] Point de recherche par géolocalisation navigateur — testé (front, `CarteRecherche`)
- [x] Point de recherche par saisie manuelle d'adresse — testé, via la nouvelle route
      `GET /evenements/geocoder` (front + back)
- [ ] Performance vérifiée (< 500 ms sur 1 000 événements)

### Inscriptions
- [x] Rejoindre un événement public — testé (201 direct, 409 si déjà inscrit,
      409 si complet)
- [x] Demande + validation pour un événement privé — testée (demande → `en_attente`,
      seul l'organisateur peut valider via `PATCH .../inscriptions/:idJoueur`,
      403 sinon, `accepter`/`refuser` testés)
- [x] Transaction sur le contrôle des places — testée en conditions réelles de
      concurrence : 10 requêtes simultanées sur un événement à 2 places → exactement
      2 acceptées, 8 refusées (409), vérifié en base. Isolation `Serializable` +
      retry sur conflit de sérialisation, dans `InscriptionRepositoryDatabase`
- [x] Passage automatique en statut "Complet" — testé, et testé en sens inverse
      (désinscription libère une place → repasse "Ouvert")
- [x] Désinscription — testée (204, 404 si pas inscrit)

### Front React
- [x] Service API centralisé (`services/api.ts`) — `credentials: "include"` sur
      chaque appel (cookie httpOnly, pas d'en-tête à injecter), erreurs traduites
      en `ErreurApi`. Aucun `fetch` en dur ailleurs dans le code
- [x] Store Redux Toolkit pour l'authentification (`authSlice`) — voir section 9.
      Hydratation de la session au démarrage via `useHydrateAuth` (`GET /auth/profil`,
      le cookie httpOnly ne peut pas être lu directement par le front)
- [x] Écran connexion — formulaire fonctionnel (`useConnexionForm`), connecté au
      cookie httpOnly, testé manuellement de bout en bout
- [x] Écran carte de recherche — fonctionnel : adresse (géocodée côté serveur) ou
      géolocalisation navigateur, rayon ajustable, liste triée par distance. Pas
      encore de carte visuelle interactive (Leaflet à ajouter), style minimal
- [x] Écran fiche événement — fonctionnel : infos, lieu, photo si présente, liste
      des inscrits, bouton d'inscription (états : non connecté / organisateur /
      rejoindre / demander à rejoindre / en attente / inscrit / complet / terminé).
      Organisateur : modification de l'événement (`useModificationEvenementForm`,
      mêmes champs qu'à la création sans l'adresse) et validation des demandes en
      attente sur un événement privé (accepter/refuser, `PATCH .../inscriptions/:idJoueur`).
      Testé manuellement de bout en bout contre la vraie API (inscription,
      désinscription, demande/validation privée, modification). Carte visuelle
      pas encore ajoutée (dépend de Leaflet, voir écran carte de recherche)
- [x] Écran création d'annonce — formulaire en trois blocs (`useCreationEvenementForm`),
      accessible depuis la carte de recherche, garde de rôle (`joueur` uniquement,
      cf. tableau des droits — un visiteur ou un administrateur ne voit pas le
      formulaire). Testé manuellement de bout en bout contre la vraie API
      (création, redirection vers la fiche événement créée). Écart signalé : la
      maquette du bloc "Caractéristiques" mentionne un champ "format", absent du
      MCD — remplacé par le champ existant `typeTerrain` (rattaché au bloc "Lieu
      et date", où il a plus de sens)
- [x] Écran tableau de bord admin (`/admin`) — connexion dédiée réutilisant
      `POST /auth/connexion` (même compte, pas de second système), garde de rôle
      côté front (confort d'usage, la vraie protection reste `verifierRole`
      côté API). Liste des signalements en attente, deux actions par événement
      (désactiver + avertir / rejeter le signalement). Testé manuellement de bout
      en bout contre la vraie API (connexion admin, signalement, sanction — 404
      ensuite sur l'événement —, rejet — événement inchangé)
- [ ] Responsive (desktop / tablette / mobile)

### Présences
- [x] Marquage manuel (secours) — `POST /evenements/:id/presences/manuel`, testé
      (200, 409 si le joueur n'est pas inscrit/accepté, 403 si pas l'organisateur)
- [x] Génération du jeton QR côté serveur — `GET /evenements/:id/presences/jeton`,
      testée (JWT court avec `type:"presence"`, refusé si pas le jour de l'événement
      ou pas inscrit/accepté)
- [ ] Affichage du QR côté joueur — dépend du front, pas commencé
- [x] Scan côté organisateur — `POST /evenements/:id/presences/scan`, testé (200,
      403 si pas l'organisateur, 400 si jeton invalide/expiré/mauvais événement,
      400 si un jeton d'authentification classique est présenté à la place)
- [x] Passage en statut "Terminé" — `POST /evenements/:id/terminer`, testé (204,
      403 si pas l'organisateur, 409 si déjà terminé)

### Modération
- [x] Signalement d'un événement — `POST /evenements/:id/signalements`, testé
      (201, 409 si doublon même joueur/événement/motif, 404 si événement inexistant)
- [x] Consultation des signalements en attente (admin) — `GET /moderation/signalements`,
      testée (403 si pas admin, liste enrichie motif + titre événement, exclut les
      événements déjà désactivés). Pas d'écran dédié encore (voir Front React)
- [x] Désactivation + avertissement — `POST /moderation/evenements/:id/sanctionner`,
      testé (soft delete de l'événement + statut "averti" sur l'organisateur, vérifié
      en base). Faux signalement : `DELETE /moderation/evenements/:id/signalements`,
      testé (événement inchangé, signalements retirés)

### Qualité et déploiement
- [x] Tests Jest sur la couche Service — 69 tests, 8 services (Auth, Evenement,
      RechercheEvenement, Inscription, Presence, Moderation, Geocodage, Photo), repositories
      substitués par des doubles en mémoire (`tests/doubles/`) implémentant les
      interfaces du domaine. Transform `@swc/jest` (rapide, pas de vérification de
      types) + `tsc --noEmit -p tsconfig.tests.json` en complément pour le typage
      strict des tests eux-mêmes (`npm run typecheck:tests`). Corrigé le 13/09/2026 :
      `tsconfig.tests.json` héritait silencieusement de l'`exclude: ["tests"]` du
      tsconfig parent (les `include`/`exclude` ne se fusionnent pas avec `extends`)
      — la commande ne vérifiait en réalité aucun fichier de `tests/` depuis sa
      création. Deux non-conformités réelles dans `EvenementRepositoryFake`
      dormaient derrière ce trou (interface pas respectée à la lettre).
- [ ] `Jenkinsfile` en place
- [ ] Déploiement HTTPS

---

## Stack technique imposée

| Couche | Technologie |
|---|---|
| Front-end | React + TypeScript |
| Back-end | Node.js 24 LTS + Express, **TypeScript** |
| Validation | **Zod** (schémas partagés front / back) |
| Base de données | PostgreSQL + extension **PostGIS** |
| ORM | **Prisma** (CRUD standard) + SQL brut via `$queryRaw` pour PostGIS |
| Conteneurisation | Docker / docker-compose |
| Tests | Jest |
| CI/CD | Jenkins (cible) |
| Orchestration | Kubernetes (cible) |

---

## Principes de développement

### TypeScript

- Mode `strict` activé
- Pas de `any`. En particulier, tout retour de `JSON.parse` et toute réponse d'API
  externe doit être typé explicitement — sans quoi l'éditeur ne détecte plus rien
- Les types métier (`Evenement`, `Utilisateur`, `Inscription`) vivent dans `src/domain/`
  et ne dépendent ni d'Express, ni des types générés par Prisma. Les services manipulent
  ces types du domaine, jamais des `Request` ni des types Prisma (modèle généré,
  `Prisma.EvenementGetPayload<...>`, etc.) — la conversion se fait dans le Repository

### SOLID, appliqué au projet

Deux principes portent réellement ici :

**Responsabilité unique.** Chaque couche a une raison de changer et une seule.
Le Controller change si le contrat HTTP change. Le Service change si une règle métier
change. Le Repository change si le schéma de base change.

**Inversion des dépendances.** Le Service dépend d'une **interface**, pas d'une classe
concrète :

```ts
// src/domain/ports/IEvenementRepository.ts
export interface IEvenementRepository {
  rechercherParRayon(lon: number, lat: number, rayonM: number): Promise<Evenement[]>;
  creer(evenement: NouvelEvenement): Promise<Evenement>;
}

// src/services/EvenementService.ts
export class EvenementService {
  constructor(private readonly repository: IEvenementRepository) {}
}
```

L'implémentation concrète s'appuie sur Prisma, mais reste cachée derrière l'interface :

```ts
// src/repositories/EvenementRepositoryDatabase.ts
export class EvenementRepositoryDatabase implements IEvenementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async rechercherParRayon(lon: number, lat: number, rayonM: number): Promise<Evenement[]> {
    // PostGIS non modélisé par Prisma → seule requête du projet en SQL brut, via $queryRaw
    const lignes = await this.prisma.$queryRaw<LigneRecherche[]>`...`;
    return lignes.map(this.versEntite);
  }

  async creer(evenement: NouvelEvenement): Promise<Evenement> {
    const ligne = await this.prisma.evenement.create({ data: { /* ... */ } });
    return this.versEntite(ligne);
  }
}
```

C'est ce qui rend les tests Jest immédiats : on injecte un double au lieu de la base.

Les trois autres principes (ouvert/fermé, Liskov, ségrégation des interfaces) se
respectent ici par absence de violation, faute de hiérarchie de types. Ne pas
introduire d'héritage artificiel pour "les appliquer".

### Injection de dépendances

Un seul point de composition, sans bibliothèque :

```ts
// src/config/container.ts
import { prisma } from "./prismaClient";

const evenementRepository = new EvenementRepositoryDatabase(prisma);
const geocodageService   = new GeocodageService();
const evenementService   = new EvenementService(evenementRepository, geocodageService);
export const evenementController = new EvenementController(evenementService);
```

Aucun `new` de repository ailleurs dans le code. Pas d'InversifyJS ni de conteneur IoC :
sur ce périmètre, c'est de la complexité sans contrepartie.

### Architecture en couches

```
Controller  → contrat HTTP : lecture de la requête, codes de retour
Service     → logique métier, règles de gestion
Repository  → accès aux données, requêtes SQL
```

Le Service ne contient jamais de SQL. Le Repository ne contient jamais de règle métier.
Les dépendances vont toujours vers le bas : un Repository ne remonte jamais vers un Service.

Le Repository s'appuie sur **Prisma** pour les opérations CRUD standards (créer,
modifier, lire par id). Exception assumée et unique : la recherche géolocalisée, où
Prisma ne modélise pas les types géographiques PostGIS. Cette requête reste en SQL
brut, via `prisma.$queryRaw` (tagged template : les paramètres sont liés, jamais
interpolés en chaîne — même garantie qu'une requête préparée `pg`). Nulle part
ailleurs dans le projet.

**Position à tenir devant le jury :** une architecture hexagonale ou en oignon a été
évaluée et écartée. Le domaine d'OnThePitch (contrôle de places, de dates, résolution
d'adresses) ne justifie pas une couche de cas d'usage supplémentaire qui ne ferait que
transiter les données. L'inversion de dépendance sur les repositories apporte l'essentiel
du bénéfice — testabilité, indépendance vis-à-vis de la base — sans le coût structurel.

### Choix Prisma plutôt que `pg` brut

Le dossier envisageait initialement des requêtes SQL manuscrites via `pg`. Prisma est
retenu à la place : migrations versionnées à partir d'un schéma unique, types générés
automatiquement (une garantie de plus contre les `any` interdits par ce dossier), et
nettement moins de code répétitif sur les opérations CRUD (inscription, connexion,
création d'événement, inscriptions). L'inversion de dépendance sur
`IEvenementRepository` est conservée à l'identique : le Service ne connaît jamais
Prisma, seul le Repository l'importe — Prisma est un détail d'implémentation du
Repository, pas une fuite d'infrastructure vers le domaine. Sur la recherche
géolocalisée, qui reste la fonctionnalité prioritaire, ce choix ne change rien :
PostGIS n'étant pas modélisé par l'ORM, la requête `ST_DWithin`/`ST_Distance` reste
écrite à la main via `$queryRaw`, exactement comme prévu à l'origine.

### Express et REST

- Express fonctionne en pile de middlewares. Chaque middleware reçoit
  `(req, res, next)` et transmet au suivant
- **Gestionnaire d'erreurs centralisé**, signature à quatre paramètres
  `(err, req, res, next)`, déclaré en dernier. Les controllers ne dupliquent pas
  les `try/catch` : ils laissent remonter et le gestionnaire traduit en réponse HTTP
- **Validation en middleware séparé**, en amont du controller, via schéma Zod.
  Un controller ne valide pas, il reçoit des données déjà valides
- **API sans état** (contrainte REST) : aucune session serveur. L'identité et le rôle
  sont portés par le JWT, vérifiés à chaque requête — transporté dans un cookie
  httpOnly plutôt qu'un en-tête `Authorization` (voir section 2), ce qui ne change
  rien à la statelessness : `jwt.verify` ne dépend d'aucun état stocké côté serveur,
  quel que soit le canal de transport. C'est ce qui permettra la mise à l'échelle
  horizontale sous Kubernetes
- Routes nommées sur les ressources : `GET /evenements`, `POST /evenements`,
  `POST /evenements/:id/inscriptions`

### Validation avec Zod

Un schéma sert trois usages à la fois : validation, message d'erreur, et type TypeScript.

```ts
export const creationEvenementSchema = z.object({
  titre: z.string().min(3).max(50),
  adresse: z.string().min(5),
  dateDebut: z.coerce.date(),
  nombrePlaces: z.number().int().min(2).max(30),
  estPrive: z.boolean(),
});

export type CreationEvenement = z.infer<typeof creationEvenementSchema>;
```

Les schémas sont partagés entre le front et le back — même règle, même message, une
seule source de vérité.

### Front React

- **Composants fonctionnels uniquement**, props typées par une interface
- **Le composant affiche, il ne raisonne pas.** Toute logique de formulaire
  (mise à jour des champs, validation Zod, condition de soumission) part dans un
  hook dédié : `useCreationEvenementForm`, `useRechercheForm`
- **Service API isolé** dans `src/services/api.ts` : centralise l'URL de base,
  l'envoi du cookie de session (`credentials: "include"` — pas d'en-tête à injecter,
  voir section 2) et le traitement des erreurs. Aucun `fetch` en dur dans un composant
- **État global limité à l'authentification**, via un store **Redux Toolkit**
  (`authSlice` : utilisateur, rôle, jeton). Le reste — résultats de recherche, fiche
  événement — reste en état local de page

> Décision du 12/09/2026 : Redux Toolkit n'est pas strictement nécessaire ici — un
> seul état est réellement partagé (l'authentification), un Context React aurait
> suffi pour ~30-50 % de code en moins (pas de store, pas de `<Provider>`, pas de
> dépendance supplémentaire). Retenu quand même, choix assumé pour démontrer la
> maîtrise de l'outil vu en cours — périmètre volontairement limité à
> l'authentification : ni la recherche ni la fiche événement n'ont de slice, ce
> sont des données propres à chaque page, mal adaptées à un store global (elles
> devraient se réinitialiser à chaque visite d'écran, source de bugs d'état
> périmé). Ne pas étendre Redux au-delà de l'auth sans le signaler explicitement.
> Nouvelles dépendances : `@reduxjs/toolkit`, `react-redux`.

---

## Modèle de données

Issu du MCD/MLD MERISE. Les noms de tables et colonnes ci-dessous font foi :
le code doit s'y conformer exactement.

### utilisateur
```
id_joueur        INT PK
nom              VARCHAR(50)
prenom           VARCHAR(50)
email            VARCHAR(50)  UNIQUE
mot_de_passe     VARCHAR(255)  -- hash bcrypt
ville            VARCHAR(50)
date_inscription DATETIME
last_login       DATETIME
id_statut        INT FK → statut_utilisateur
id_niveau        INT FK → niveau_utilisateur
role             VARCHAR(20)   -- 'joueur' | 'administrateur'  (À AJOUTER au MCD)
```

### evenement
```
id_evenement         INT PK
titre                VARCHAR(50)
nombre_places        INT
type_prive_publique  BOOLEAN     -- true = privé, false = public
date_creation        DATETIME
date_debut           DATETIME
date_fin             DATETIME
date_desactivation   DATETIME    -- soft delete : NULL = actif
id_lieu              INT FK → lieu
id_statut_event      INT FK → statut_event
id_joueur            INT FK → utilisateur  (organisateur)
```

### lieu
```
id_lieu       INT PK
region        VARCHAR(50)
ville         VARCHAR(50)
adresse       VARCHAR(50)
code_postal   VARCHAR(50)
type_terrain  VARCHAR(50)
latitude      DECIMAL(10,7)   -- issu du géocodage
longitude     DECIMAL(10,7)   -- issu du géocodage
photo         BYTEA           -- À AJOUTER au MCD (absent actuellement)
photo_type    VARCHAR(100)    -- type MIME de la photo ; À AJOUTER au MCD
```

> La position géographique est portée par **lieu**, pas par evenement.

> **Photo du lieu** (ajoutée le 11/09/2026, à la demande du porteur de projet) :
> stockée en base (`bytea`), pas de service de stockage de fichiers (S3-like) —
> absent de la stack imposée. Jamais incluse dans les réponses JSON de liste ou de
> recherche (romprait le budget de 500 ms) : servie à part via une route dédiée
> (`GET /evenements/:id/photo`), chargée par le navigateur comme une URL d'image
> classique. Upload en `multipart/form-data` via `multer` (nouvelle dépendance),
> stockage en mémoire uniquement côté serveur — jamais sur disque, pour ne pas
> casser le caractère sans état de l'API (mise à l'échelle horizontale sous K8s).
> Plafonné à 2 Mo, jpeg/png/webp uniquement.

### rejoint (inscription d'un joueur à un événement)
```
id_joueur           INT PK/FK
id_evenement        INT PK/FK
date_inscription    DATETIME
presence            DATETIME    -- alimenté au scan du QR code
statut_inscription  VARCHAR(50) -- 'en_attente' | 'acceptee' | 'refusee'
```

### signal (signalement d'un événement)
```
id_joueur        INT PK/FK
id_evenement     INT PK/FK
id_motif         INT PK/FK
date_signalement DATETIME
texte_libre      VARCHAR(255)
```

### evaluation
```
id_joueur       INT PK/FK
id_evenement    INT PK/FK
note            INT
date_evaluation DATETIME
commentaire     VARCHAR(255)
```

### Tables de référence
```
statut_utilisateur  (id_statut, libelle_statut)
niveau_utilisateur  (id_niveau, libelle_niveau)
statut_event        (id_statut_event, libelle_event)   -- Ouvert | Complet | Terminé
niveau_event        (id_niveau_event, libelle_niveau_event)
motif               (id_motif, libelle)
requiert            (id_evenement, id_niveau_event)
```

### Index obligatoire

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX idx_lieu_position
  ON lieu USING GIST (
    ST_MakePoint(longitude, latitude)::geography
  );
```

En pratique, ces deux instructions vivent dans une migration Prisma
(`prisma/migrations/.../migration.sql`), pas dans un script `init.sql` séparé — cohérent
avec le choix de Prisma comme ORM (voir plus haut, section "Choix Prisma plutôt que
`pg` brut").

---

## Rôles et droits

| Fonctionnalité | Visiteur | Joueur | Admin |
|---|---|---|---|
| Consulter les événements | ✓ | ✓ | ✓ |
| S'inscrire sur la plateforme | ✓ | — | — |
| Se connecter | — | ✓ | ✓ |
| Créer un événement | — | ✓ | — |
| Rejoindre un événement | — | ✓ | — |
| Se désinscrire d'un événement | — | ✓ | — |
| Annuler une annonce | — | ✓ (les siennes) | ✓ |
| Marquer les présences | — | ✓ (les siennes) | — |
| Modérer les annonces | — | — | ✓ |
| Gérer avertissements / bans | — | — | ✓ |

---

## Fonctionnalités à développer

### 1. Socle technique

- `docker-compose.yml` : services `db` (postgis/postgis:16-3.4), `api`, `client`
- Variables sensibles dans `.env` non versionné + `.env.example` fourni
- Extension PostGIS + index GIST créés via une migration Prisma
  (`prisma/migrations/`), pas via un `init.sql` monté dans `docker-entrypoint-initdb.d/`
- Structure de dossiers :

```
onthepitch/
├── api/
│   ├── src/
│   │   ├── domain/          # types métier + interfaces de repository
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middlewares/     # authentifier, verifierRole, valider, erreurs
│   │   ├── schemas/         # schémas Zod
│   │   └── config/          # container.ts, pool PostgreSQL
│   ├── tests/
│   └── package.json
├── client/
│   └── src/{components,pages,hooks,services,context}
├── docker-compose.yml
└── Jenkinsfile
```

### 2. Authentification et rôles

Flux : Route → middleware de validation (Zod) → Controller → Service → Repository.

- Inscription : hachage bcrypt, la base ne contient jamais le mot de passe en clair
- Connexion : émission d'un JWT contenant `id_joueur` et `role`
- **Transport du jeton : cookie `httpOnly`** (revu le 12/09/2026, à la demande du
  porteur de projet), posé par le serveur (`config/cookie.ts`) à la connexion —
  jamais renvoyé dans le corps JSON, jamais lu par le JavaScript du front. Protège
  contre le vol de jeton par XSS, contrairement à un jeton stocké côté client
  (`localStorage` ou état JS) et rejoué via un en-tête `Authorization`. Implique
  `POST /auth/deconnexion` (le front ne peut pas effacer lui-même un cookie
  httpOnly) et `credentials: "include"` sur chaque appel `fetch` du front
- Middleware `authentifier` : vérifie le jeton (lu dans le cookie, jamais un
  en-tête), rattache l'utilisateur à `req`
- Middleware `verifierRole('administrateur')` : contrôle d'accès sur les routes admin
- **Authentification et autorisation restent deux middlewares distincts** : l'un répond
  « qui es-tu », l'autre « as-tu le droit »
- Le rôle est porté par le jeton, pas de requête en base à chaque contrôle

### 3. Géocodage des adresses

- Service dédié `GeocodageService`, appelé **côté serveur uniquement**
- Le client React ne contacte jamais le service de géocodage directement
- API utilisée : API Adresse du gouvernement (`https://api-adresse.data.gouv.fr/search`)
- La réponse est typée explicitement, jamais laissée en `any`
- Géocodage effectué **une seule fois**, à la création ou modification d'un événement
- Résultat stocké dans `lieu.latitude` / `lieu.longitude`
- **Si l'adresse ne peut pas être résolue → refus de la création** avec message explicite.
  Un événement sans coordonnées serait invisible dans toutes les recherches.
- Distinguer deux codes d'erreur : adresse invalide vs service indisponible

### 4. Recherche géolocalisée (PRIORITÉ)

Le joueur définit son point de recherche de deux façons :
- géolocalisation du navigateur — coordonnées directement exploitables, rien à ajouter
- **saisie manuelle d'une adresse ou d'une ville** (pour chercher ailleurs que chez soi,
  en déplacement ou en vacances) — nécessite de convertir cette saisie en coordonnées.
  Comme le client ne doit jamais appeler l'API Adresse lui-même (section 3), une route
  dédiée expose le `GeocodageService` déjà existant : `GET /evenements/geocoder?adresse=...`
  (ajoutée le 12/09/2026 — le besoin n'avait pas été anticipé avant d'attaquer le front)

Puis il choisit un rayon et obtient les événements du périmètre, triés par distance.

**Repository** — seule requête SQL brute du projet, Prisma ne modélisant pas PostGIS.
Paramètres liés via tagged template `$queryRaw` (jamais d'interpolation de chaîne) :

```ts
const evenements = await prisma.$queryRaw<LigneRecherche[]>`
  SELECT e.id_evenement, e.titre, e.date_debut, e.nombre_places,
         l.adresse, l.ville,
         ST_Distance(
           ST_MakePoint(l.longitude, l.latitude)::geography,
           ST_MakePoint(${lon}, ${lat})::geography
         ) AS distance
  FROM evenement e
  JOIN lieu l ON l.id_lieu = e.id_lieu
  WHERE ST_DWithin(
          ST_MakePoint(l.longitude, l.latitude)::geography,
          ST_MakePoint(${lon}, ${lat})::geography, ${rayonM}
        )
    AND e.date_debut > NOW()
    AND e.date_desactivation IS NULL
  ORDER BY distance ASC;
`;
```

> Public et privé apparaissent tous les deux dans ces résultats (revu le 11/09/2026,
> à la demande explicite du porteur de projet — la version précédente excluait les
> événements privés de la recherche). "Privé" ne conditionne que le mécanisme
> d'inscription (voir section 6), pas la visibilité : avec des id numériques
> auto-incrémentés, prétendre les cacher n'aurait été qu'une confidentialité de
> façade. Aucune notion de liste d'invités n'existe dans le MCD ; ne pas en
> introduire une sans le signaler explicitement.

**Service** — règles métier :
- rayon par défaut : 10 km si aucun n'est fourni
- conversion km → mètres avant appel au repository
- conversion des distances en km pour l'affichage
- recherche sans résultat → liste vide, pas une erreur

**Critère de performance :** moins de 500 ms sur un jeu de 1 000 événements.

### 5. Création d'événement

Formulaire en trois blocs (cf. maquettes) :
1. Lieu et date — adresse, nom du lieu (facultatif), date, heure début, heure fin
2. Caractéristiques — titre, format, nombre de places, niveau attendu, description
3. Visibilité — public ou privé

Flux : validation Zod → géocodage → insertion `lieu` puis `evenement` → statut "Ouvert".

### 6. Rejoindre un événement

Logique du diagramme d'activité, à respecter :

```
Sélectionner un événement
├── Événement public ?
│   ├── Oui → demande directe
│   └── Non → demande envoyée à l'organisateur
│              └── refusée → "Demande refusée", fin
├── Déjà inscrit ? → message d'erreur, fin
├── Places disponibles ?
│   ├── Non → "Événement complet", fin
│   └── Oui → ajouter le joueur à la liste
│             └── dernière place ? → passer l'événement en "Complet"
└── Confirmer l'inscription
```

**Attention aux inscriptions concurrentes** : le contrôle des places et l'insertion
doivent être dans une transaction, sinon deux joueurs peuvent prendre la même
dernière place.

### 7. Marquer les présences — par QR code

Choix retenu : **chaque joueur affiche son QR, l'organisateur scanne**.
(Le sens inverse permettrait de transmettre le QR par messagerie à un absent.)

> Discuté le 08/09/2026 : l'inverse (un QR unique affiché par l'organisateur,
> chaque joueur se scanne lui-même) a été envisagé puis écarté — confirmé après
> discussion. Retenu pour la même raison qu'à l'origine : l'organisateur doit
> visuellement constater la présence de chaque joueur, ce qu'un scan
> auto-administré ne garantit pas.

- L'API génère pour chaque joueur inscrit un jeton signé (JWT court, valable le
  jour de l'événement) contenant `id_joueur` + `id_evenement`
- Le front l'encode en QR (`qrcode.react`)
- L'organisateur scanne via `html5-qrcode` (API `getUserMedia`)
- Le serveur vérifie : signature valide, scanneur = organisateur de cet événement,
  joueur bien inscrit → alimente `rejoint.presence`
- **HTTPS obligatoire** pour l'accès caméra (localhost excepté en développement)
- Conserver le marquage manuel en secours (batterie vide, téléphone cassé)
- Une fois les présences validées → événement en "Terminé"

### 8. Modération

- Un joueur signale un événement (table `signal`, avec motif)
- L'admin consulte les signalements dans son tableau de bord
- Événement non conforme → soft delete (`date_desactivation`) + avertissement au joueur
- Faux signalement → retrait du signalement

> Pas de backoffice séparé (précisé le 08/09/2026, en cohérence avec la simplicité
> visée) : le "tableau de bord admin" est le 4e écran de la même application React
> (`/admin`), pas un produit à part. Voir section 9.

### 9. Front React

Quatre écrans, maquettés pour les trois premiers :
- **Carte de recherche** : filtres (adresse/géoloc, rayon, date), carte, liste triée par distance
- **Fiche événement** : infos, carte, liste des inscrits, bouton d'inscription
  (états : inscription possible / complet / désinscription)
- **Création d'annonce** : formulaire en trois blocs
- **Tableau de bord admin** (`/admin`, non maquetté) : écran de connexion dédié qui
  réutilise `POST /auth/connexion` (même compte, même mot de passe — pas un second
  système d'authentification), puis liste des signalements en attente avec deux
  actions (désactiver l'événement + avertir le joueur, ou rejeter le signalement).
  Protégé par une garde de route côté front (redirige si `role !== 'administrateur'`)
  — confort d'usage uniquement. La vraie protection reste `verifierRole('administrateur')`
  côté API, comme pour toute route admin : une URL non devinable n'est pas un
  mécanisme de sécurité et ne doit jamais être présentée comme tel.

**Responsive, trois points de rupture (écrans 1 à 3 uniquement) :**
- Desktop : carte et liste côte à côte
- Tablette : liste sous la carte
- Mobile : bascule liste/carte, navigation en menu

---

## Conventions

- Code, noms de variables et commentaires **en français** (cohérence avec le dossier)
- TypeScript strict, pas de `any`
- Requêtes préparées systématiques (protection injection SQL) — assuré nativement par
  Prisma pour le CRUD, et par tagged template `$queryRaw` pour la requête géolocalisée
- Soft delete via `date_desactivation`, jamais de DELETE physique sur `evenement`
- Messages d'erreur utilisateur en français, explicites
- Tests Jest sur la couche Service, repository substitué par un double via l'interface

## Ordre de développement recommandé

1. Socle : docker-compose + migration Prisma (PostGIS) + serveur Express + container + middleware d'erreurs
2. Authentification : inscription, connexion, middlewares
3. Création d'événement + géocodage
4. **Recherche géolocalisée** (la feature à soigner)
5. Inscriptions (rejoindre / se désinscrire)
6. Front React : les trois écrans
7. Présences par QR code
8. Modération
9. Tests Jest

## Points de vigilance

- `latitude` et `longitude` doivent être ajoutés au MCD Looping (absents actuellement)
- Le rôle `administrateur` doit être ajouté à `utilisateur` (absent actuellement)
- Nettoyer les noms de colonnes avant génération du MPD : accents (`prénom`,
  `libellé_statut`) et underscores traînants. Avec Prisma, le `@map`/`@@map` du schéma
  absorbe ce problème pour tout le CRUD généré ; ça reste pertinent uniquement pour la
  requête PostGIS en SQL brut, qui référence les noms de colonnes réels de la base
- Le diagramme de séquence "Créer un événement" ne montre pas le `GeocodageService` :
  à mettre à jour pour rester cohérent avec le code
- `photo` et `photo_type` doivent être ajoutés à `lieu` au MCD Looping (absents
  actuellement, voir section "Modèle de données")

## Évolutions envisagées (hors périmètre initial)

**Cache Redis sur le géocodage.** Une adresse résolue ne change jamais : ses coordonnées
peuvent être mises en cache sans risque d'obsolescence. Utile si plusieurs événements
sont créés au même endroit (terrain municipal, city stade régulier). À ne pas étendre
aux événements eux-mêmes : places restantes et inscriptions évoluent en permanence,
les mettre en cache reviendrait à servir des données fausses.

**Système d'évaluation entre joueurs** (table `evaluation` déjà modélisée).

---

## Instructions pour Claude Code

- Lire la section « Suivi d'avancement » en début de session pour savoir où en est le projet
- Cocher les cases correspondantes en fin de session, uniquement pour ce qui tourne
- Ne pas dévier du modèle de données ci-dessus sans le signaler explicitement
- Si un écart apparaît entre ce fichier et le code existant, le signaler avant de coder
- En cas de doute entre deux solutions, appliquer la règle de simplicité en tête de fichier
