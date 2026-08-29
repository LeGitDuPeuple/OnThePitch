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
- [ ] `docker-compose.yml` fonctionnel (db + api + client)
- [ ] `init.sql` exécuté au démarrage, extension PostGIS active
- [ ] Serveur Express qui démarre et répond sur une route de santé
- [ ] Structure de dossiers en place (controllers / services / repositories)
- [ ] `container.ts` (composition des dépendances)
- [ ] Middleware d'erreurs centralisé
- [ ] `.env.example` versionné, `.env` ignoré

### Authentification
- [ ] Inscription avec hachage bcrypt
- [ ] Connexion avec émission du JWT
- [ ] Middleware `authentifier`
- [ ] Middleware `verifierRole`
- [ ] Schémas Zod de validation partagés

### Événements
- [ ] `GeocodageService` (API Adresse) opérationnel
- [ ] Création d'événement avec géocodage et refus si adresse non résolue
- [ ] Modification / annulation (soft delete)
- [ ] Consultation d'un événement (détail + inscrits)

### Recherche géolocalisée
- [ ] Requête PostGIS `ST_DWithin` + `ST_Distance` dans le repository
- [ ] Index GIST créé
- [ ] Règles métier du service (rayon par défaut, conversions)
- [ ] Point de recherche par géolocalisation navigateur
- [ ] Point de recherche par saisie manuelle d'adresse
- [ ] Performance vérifiée (< 500 ms sur 1 000 événements)

### Inscriptions
- [ ] Rejoindre un événement public
- [ ] Demande + validation pour un événement privé
- [ ] Transaction sur le contrôle des places
- [ ] Passage automatique en statut "Complet"
- [ ] Désinscription

### Front React
- [ ] Service API centralisé avec injection du jeton
- [ ] Contexte d'authentification
- [ ] Écran carte de recherche
- [ ] Écran fiche événement
- [ ] Écran création d'annonce
- [ ] Responsive (desktop / tablette / mobile)

### Présences
- [ ] Marquage manuel (secours)
- [ ] Génération du jeton QR côté serveur
- [ ] Affichage du QR côté joueur
- [ ] Scan côté organisateur
- [ ] Passage en statut "Terminé"

### Modération
- [ ] Signalement d'un événement
- [ ] Tableau de bord admin
- [ ] Désactivation + avertissement

### Qualité et déploiement
- [ ] Tests Jest sur la couche Service
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
  et ne dépendent ni d'Express, ni de `pg`. Les services manipulent ces types, jamais
  des `Request` ou des `QueryResult`

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

C'est ce qui rend les tests Jest immédiats : on injecte un double au lieu de la base.

Les trois autres principes (ouvert/fermé, Liskov, ségrégation des interfaces) se
respectent ici par absence de violation, faute de hiérarchie de types. Ne pas
introduire d'héritage artificiel pour "les appliquer".

### Injection de dépendances

Un seul point de composition, sans bibliothèque :

```ts
// src/config/container.ts
const evenementRepository = new PostgresEvenementRepository(pool);
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

**Position à tenir devant le jury :** une architecture hexagonale ou en oignon a été
évaluée et écartée. Le domaine d'OnThePitch (contrôle de places, de dates, résolution
d'adresses) ne justifie pas une couche de cas d'usage supplémentaire qui ne ferait que
transiter les données. L'inversion de dépendance sur les repositories apporte l'essentiel
du bénéfice — testabilité, indépendance vis-à-vis de la base — sans le coût structurel.

### Express et REST

- Express fonctionne en pile de middlewares. Chaque middleware reçoit
  `(req, res, next)` et transmet au suivant
- **Gestionnaire d'erreurs centralisé**, signature à quatre paramètres
  `(err, req, res, next)`, déclaré en dernier. Les controllers ne dupliquent pas
  les `try/catch` : ils laissent remonter et le gestionnaire traduit en réponse HTTP
- **Validation en middleware séparé**, en amont du controller, via schéma Zod.
  Un controller ne valide pas, il reçoit des données déjà valides
- **API sans état** (contrainte REST) : aucune session serveur. L'identité et le rôle
  sont portés par le JWT, vérifiés à chaque requête. C'est ce qui permettra la mise à
  l'échelle horizontale sous Kubernetes
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
  l'injection du jeton et le traitement des erreurs. Aucun `fetch` en dur dans un composant
- **État global limité à l'authentification**, via un contexte React
  (`AuthContext` : utilisateur, rôle, jeton). Le reste — résultats de recherche, fiche
  événement — reste en état local de page

> Redux Toolkit est le pattern enseigné en cours. Il est écarté ici : sur trois écrans
> dont un seul état réellement partagé, la mise en place de slices, actions et reducers
> coûte plus qu'elle ne rapporte. Si le formateur l'exige, la bascule se fait sans
> refonte : le contexte est remplacé par un `authSlice`, le reste ne bouge pas.

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
```

> La position géographique est portée par **lieu**, pas par evenement.

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
- `init.sql` monté dans `/docker-entrypoint-initdb.d/`
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
- Middleware `authentifier` : vérifie le jeton, rattache l'utilisateur à `req`
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
- géolocalisation du navigateur
- **saisie manuelle d'une adresse ou d'une ville** (pour chercher ailleurs que chez soi,
  en déplacement ou en vacances)

Puis il choisit un rayon et obtient les événements du périmètre, triés par distance.

**Repository** — requête PostGIS, paramètres en requête préparée :

```sql
SELECT e.id_evenement, e.titre, e.date_debut, e.nombre_places,
       l.adresse, l.ville,
       ST_Distance(
         ST_MakePoint(l.longitude, l.latitude)::geography,
         ST_MakePoint($1, $2)::geography
       ) AS distance
FROM evenement e
JOIN lieu l ON l.id_lieu = e.id_lieu
WHERE ST_DWithin(
        ST_MakePoint(l.longitude, l.latitude)::geography,
        ST_MakePoint($1, $2)::geography, $3
      )
  AND e.type_prive_publique = false
  AND e.date_debut > NOW()
  AND e.date_desactivation IS NULL
ORDER BY distance ASC;
```

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

### 9. Front React

Trois écrans principaux, maquettés :
- **Carte de recherche** : filtres (adresse/géoloc, rayon, date), carte, liste triée par distance
- **Fiche événement** : infos, carte, liste des inscrits, bouton d'inscription
  (états : inscription possible / complet / désinscription)
- **Création d'annonce** : formulaire en trois blocs

**Responsive, trois points de rupture :**
- Desktop : carte et liste côte à côte
- Tablette : liste sous la carte
- Mobile : bascule liste/carte, navigation en menu

---

## Conventions

- Code, noms de variables et commentaires **en français** (cohérence avec le dossier)
- TypeScript strict, pas de `any`
- Requêtes préparées systématiques (protection injection SQL)
- Soft delete via `date_desactivation`, jamais de DELETE physique sur `evenement`
- Messages d'erreur utilisateur en français, explicites
- Tests Jest sur la couche Service, repository substitué par un double via l'interface

## Ordre de développement recommandé

1. Socle : docker-compose + init.sql + serveur Express + container + middleware d'erreurs
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
  `libellé_statut`) et underscores traînants obligent à échapper les identifiants
  dans toutes les requêtes PostgreSQL
- Le diagramme de séquence "Créer un événement" ne montre pas le `GeocodageService` :
  à mettre à jour pour rester cohérent avec le code

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
