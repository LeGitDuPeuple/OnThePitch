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
- [x] `docker-compose.yml` fonctionnel (db + api + client) — 21/09/2026,
      `Dockerfile` ajoutés pour `backend/` (build Node 24 en deux étapes,
      `node:24-slim` plutôt qu'Alpine à cause du module natif de `bcrypt`,
      `prisma migrate deploy` au démarrage du conteneur) et `frontend/`
      (build Vite puis servi par nginx, avec repli sur `index.html` pour les
      routes React Router — sinon `/evenements/:id` renverrait un 404 nginx
      au rechargement direct). `api` attend que `db` soit *healthy* avant de
      démarrer ; `DATABASE_URL` réécrit pour ce service (`db:5432` plutôt que
      `localhost`, seule différence avec le `.env` de développement local).
      Bug rencontré et corrigé : `prisma7.config.ts` (porte l'URL de
      connexion pour la CLI Prisma) n'était pas copié dans l'image finale —
      `migrate deploy` échouait ("datasource.url property is required").
      Testé de bout en bout : les trois conteneurs démarrent, migrations
      appliquées automatiquement, connexion + navigation + carte interactive
      vérifiées en navigateur réel à travers la stack conteneurisée (Puppeteer),
      rechargement direct d'une route profonde vérifié (repli nginx)
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
      récupération avec octets identiques). Écart au MCD documenté (section `lieu`).
      Faille corrigée le 18/09/2026, trouvée en testant SEC-05 (cahier de
      recette) : Multer ne filtrait que sur `fichier.mimetype`, une valeur
      déclarée par le client donc falsifiable — un exécutable renommé en
      `.jpg` était accepté (`204`) et stocké tel quel. `PhotoService.televerser`
      vérifie maintenant les premiers octets du fichier (signatures
      jpeg/png/webp) avant tout enregistrement, indépendamment du Content-Type
      annoncé. Vérification maison (3 signatures) plutôt qu'une dépendance
      (`file-type` récent est ESM-only, friction inutile ici)
- [x] Format de jeu (`evenement.format`, ex. "5 contre 5") — ajouté le
      15/09/2026, présent dans la maquette (blocs "Caractéristiques" et fiche
      événement), jamais modélisé jusqu'ici. Libre comme `lieu.typeTerrain`,
      pas de table de référence dédiée. Testé (69/69 tests + contre la vraie
      API). Écart au MCD documenté (section `evenement`)

### Recherche géolocalisée
- [x] Requête PostGIS `ST_DWithin` + `ST_Distance` dans le repository — testée contre
      la vraie base (résultat trié par distance, zone vide → liste vide, pas une erreur).
      Renvoie aussi `latitude`/`longitude` par événement depuis le 14/09/2026 (pour
      poser un marqueur par résultat sur la carte interactive du front)
- [x] Index GIST créé
- [x] Règles métier du service (rayon par défaut, conversions) — testées via
      `GET /evenements/recherche` (défaut 10 km, refus > 100 km)
- [x] Point de recherche par géolocalisation navigateur — testé (front, `CarteRecherche`).
      Déclenchée aussi automatiquement au chargement de l'écran (15/09/2026, à la
      demande du porteur de projet) : plus besoin de cliquer pour voir des résultats,
      la demande de permission du navigateur reste incontournable ; refus/indisponible
      → pas d'erreur affichée, recherche manuelle par adresse toujours disponible.
      Testé avec Chrome headless (géolocalisation simulée)
- [x] Point de recherche par saisie manuelle d'adresse — testé, via la nouvelle route
      `GET /evenements/geocoder` (front + back)
- [x] Autocomplétion d'adresse (15/09/2026, à la demande du porteur de projet —
      visible sur la maquette 2.2.c, jamais câblée) — `GET /evenements/geocoder/suggestions`
      (jusqu'à 5 candidats, jamais d'erreur si rien ne correspond encore).
      Front : `useSuggestionsAdresse`, débounce 300 ms, seuil 5 caractères.
      Sur la recherche, choisir une suggestion lance la recherche directement
      (coordonnées déjà connues, pas de second géocodage). Sur la création
      d'annonce, remplit seulement le champ. Testé (3 tests + Chrome headless)
- [x] Pagination des résultats (22/09/2026, inspirée du `skip`/`take` déjà
      utilisé sur un autre projet du porteur — même principe, refait proprement
      ici à travers Controller → Service → Repository plutôt que le controller
      qui interrogeait Prisma directement comme sur ce projet de référence).
      `GET /evenements/recherche` accepte `skip`/`take` (défaut 0/10, `take`
      plafonné à 50), `LIMIT`/`OFFSET` ajoutés à la requête PostGIS. Pas de
      curseur ni de comptage total à part : "Suivant" se désactive simplement
      quand une page renvoie moins de résultats que sa taille — draw-back
      assumé, un événement peut en théorie apparaître deux fois ou sauter une
      page si la liste change entre deux clics, jugé acceptable ici. Prépare
      le terrain pour la case suivante (moins de lignes remontées par requête
      sur un gros volume). Boutons "Précédent"/"Suivant" sous la liste de
      résultats (`CarteRecherche.tsx`), toute nouvelle recherche (adresse,
      position, changement de rayon) repart de la première page. Testé : 2
      tests Jest (défaut skip/take, valeurs fournies) + vérifié contre la
      vraie API (14 événements, pagination par 5) + navigateur réel (Puppeteer :
      page 1 pleine avec "Suivant" actif, page 2 avec le reliquat et "Suivant"
      désactivé, carte mise à jour)
- [x] Performance vérifiée (24/09/2026) — 1000 événements insérés directement
      via Prisma (pas par l'API : le géocodage réel, non caché, aurait pris
      un temps déraisonnable et heurté le rate-limit de l'API Adresse du
      gouvernement pour ce seul besoin de volume, voir "Évolutions
      envisagées" sur le cache Redis), dispersés aléatoirement dans un rayon
      de ~40 km autour de Paris — tous à l'intérieur du rayon de recherche
      utilisé pour la mesure (60 km, puis 100 km), pour que la requête trie
      vraiment ~1000 lignes candidates plutôt que d'être trivialement filtrée
      par l'index GIST avant même le tri. `GET /evenements/recherche` mesuré
      à **11-55 ms** sur 10 requêtes consécutives (deux rayons), très
      largement sous les 500 ms visés — résultats vérifiés non triviaux
      (contenu réel, triés par distance croissante). Données de test
      supprimées après coup (pas de soft delete ici : script de maintenance
      ponctuel manipulant directement la base, pas une action métier de
      l'application — le principe "jamais de DELETE physique" de CLAUDE.md
      s'applique au code applicatif, pas à un script de charge jetable).

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
      cookie httpOnly, testé manuellement de bout en bout. Email validé par
      regex au blur et à la soumission (message rouge sous le champ,
      `utils/validation.ts`) ; le mot de passe n'y est volontairement pas
      soumis à un regex de complexité — un compte existant peut avoir été créé
      avant une règle plus stricte, la connexion ne doit pas se mettre à le
      refuser
- [x] Écran création de compte (`/inscription`, demandé le 14/09/2026 — absent
      des 4 écrans de la section 9, `POST /auth/inscription` existait côté back
      sans écran dédié) — `useInscriptionForm` : inscrit puis enchaîne
      automatiquement la connexion (`POST /auth/inscription` ne pose pas de
      cookie, voir CLAUDE.md section 2) pour éviter de refaire saisir les
      identifiants. Lien réciproque connexion ↔ inscription. Email et mot de
      passe validés par regex au blur et à la soumission (`utils/validation.ts` :
      email standard, mot de passe 8 caractères + majuscule + minuscule +
      chiffre — plus strict que le `min(8)` du schéma Zod côté back, jamais
      moins). Testé de bout en bout contre la vraie API
- [x] Identité visuelle — maquettes retrouvées le 14/09/2026 (`~/Téléchargements/
      OnThePitch-maquettes-planche.png` + `OnThePitch-wireframes.pdf`, fournies par
      le porteur de projet, jamais versionnées dans le dépôt : premier passage du
      front fait sans elles, d'où un décalage visuel signalé par le porteur de
      projet et corrigé dans la foulée). Jetons de design dans `index.css`
      (`--vert-marque`, `--fond-carte`, `--rayon`, etc.), boutons/inputs/badges de
      base globaux, `components/Avatar.tsx` (initiales, couleur dérivée du nom —
      pas de photo de profil dans le MCD)
- [x] Carte interactive — `components/CarteInteractive.tsx` (Leaflet + tuiles
      OpenStreetMap, `react-leaflet`), remplace le placeholder texte initial.
      Marqueurs cliquables (clic → fiche événement), cercle de rayon sur la
      recherche. Nécessitait les coordonnées par événement dans la réponse de
      recherche (absentes jusqu'ici, ajoutées côté back — voir section Recherche)
- [x] Écran carte de recherche — adresse (géocodée côté serveur) ou géolocalisation
      navigateur, rayon ajustable, liste triée par distance, carte interactive avec
      un marqueur par résultat
- [x] Écran fiche événement — infos, lieu (carte interactive), photo si présente,
      organisateur (avatar + nom — `EvenementDetail.organisateur`, ajouté côté
      back), barre de progression des places, liste des inscrits en avatars,
      bouton d'inscription (états : non connecté / organisateur / rejoindre /
      demander à rejoindre / en attente / inscrit / complet / terminé).
      Organisateur : modification de l'événement (`useModificationEvenementForm`,
      mêmes champs qu'à la création sans l'adresse) et validation des demandes en
      attente sur un événement privé (accepter/refuser). QR de présence affiché
      pour un joueur inscrit, le jour de l'événement. "Signaler un problème sur
      cette annonce" (19/09/2026 — manquait `GET /moderation/motifs`, ajoutée
      côté back pour ne pas coder la liste des motifs en dur côté front ;
      `ModerationService.listerMotifs`, `SignalementRepositoryDatabase`,
      testé) : réservé à un joueur connecté non-organisateur
      (`useSignalement`), formulaire motif + précisions facultatives, vérifié
      de bout en bout (signalement visible ensuite dans le tableau de bord
      admin). Testé manuellement de bout en bout contre la vraie API
- [x] Écran création d'annonce — formulaire en trois blocs (`useCreationEvenementForm`),
      aperçu live du résultat de recherche à droite (desktop/tablette, cf. maquette),
      garde de rôle (`joueur` uniquement, cf. tableau des droits). Bloc
      "Caractéristiques" : Format / Nombre de places / Niveau attendu sur une
      même ligne (`FORMATS_COURANTS`, comme la maquette 2.2.c). Testé
      manuellement de bout en bout contre la vraie API
- [x] Dépôt de la photo du lieu (15/09/2026 — jusqu'ici le back exposait
      `POST /evenements/:id/photo` sans qu'aucun écran ne le propose). Champ
      fichier facultatif sur la création (`CreationAnnonce`), envoyé après coup
      une fois l'événement créé — un échec à cette étape n'annule pas
      l'événement, juste un avertissement (`MessageConfirmation`, nouvelle
      variante ambre) invitant à réessayer depuis la fiche. Sur la fiche,
      l'organisateur peut aussi déposer/remplacer la photo directement
      (`PhotoLieu`), ce qui sert à la fois de rattrapage et d'usage courant.
      `services/api.ts` géré pour accepter un corps `FormData` (pas de
      sérialisation JSON, pas de `Content-Type` forcé). Bug annexe découvert en
      testant : Helmet posait `Cross-Origin-Resource-Policy: same-origin` par
      défaut, qui bloquait silencieusement le chargement de l'`<img>` en
      cross-origin (front :5173, back :3000) — corrigé en
      `crossOriginResourcePolicy: { policy: "cross-origin" }` (`server.ts`),
      sans impact sur les autres routes (déjà protégées par CORS + cookie
      httpOnly)
- [x] Rapprochement visuel de la maquette (15/09/2026, à la demande du porteur
      de projet — première passe jugée trop éloignée) : champ `format` ajouté
      au modèle (voir section Événements), étiquettes des marqueurs de la carte
      toujours visibles + légende, avatar neutre pour "mon compte" dans l'en-tête
      (distinct des avatars colorés des autres joueurs), sous-textes "Dans N
      jours"/"X h de jeu" sur la fiche événement
- [x] Écran tableau de bord admin (`/admin`) — connexion dédiée réutilisant
      `POST /auth/connexion`, garde de rôle côté front (confort d'usage, la vraie
      protection reste `verifierRole` côté API). Liste des signalements en attente,
      deux actions par événement (désactiver + avertir / rejeter le signalement).
      Pas maquetté : style aligné sur les jetons de design communs, sans mise en
      page dédiée. Testé manuellement de bout en bout contre la vraie API
- [x] Responsive (desktop / tablette / mobile) — points de rupture mobile < 600px,
      tablette 600–1023px, desktop ≥ 1024px, sur les 3 écrans concernés (recherche,
      fiche événement, création). En-tête commun (`Entete.tsx`, `--vert-marque`),
      menu replié sur mobile — un seul système de navigation (pas de barre
      d'onglets basse séparée comme sur la maquette mobile : les pages "Mes
      événements"/"Profil" qu'elle y montre n'existent pas dans le périmètre
      actuel, cf. note ci-dessous). Carte de recherche : desktop = carte et liste
      côte à côte, tablette = liste sous la carte, mobile = bascule par onglets.
      Vérifié par build ; pas de vérification visuelle en navigateur réel cette
      session (outil d'automatisation indisponible) —à confirmer visuellement
- [x] Écran Profil joueur (`/profil`, demandé le 20/09/2026 par le porteur de
      projet, referme partiellement l'écart de périmètre ci-dessous) — trois
      listes : événements organisés, événements rejoints (statut `acceptee`
      uniquement) et demandes en attente (statut `en_attente`), chacune
      excluant les événements annulés. Les deux premières listes séparent
      "à venir" (affiché) et "terminés" (repliés dans un `<details>`, pour ne
      pas surcharger visuellement — décision explicite du porteur de projet).
      Les demandes refusées n'apparaissent dans aucune des trois listes.
      Backend : `EvenementRepository.listerParOrganisateur`,
      `InscriptionRepository.listerParJoueur` (renvoie des `Inscription`, pas
      des `Evenement` — la résolution vers l'événement actif reste dans
      `EvenementService.listerMesEvenements`, qui connaît déjà les deux
      repositories), route `GET /evenements/mes-evenements`. Aucun changement
      de schéma. Ne couvre volontairement pas le score de "Fiabilité" par
      joueur montré sur la même page de la maquette — celui-ci reste bloqué
      par l'absence de système de notation (voir note ci-dessous et
      "Évolutions envisagées"). Lien "Mon profil" dans l'en-tête, réservé au
      rôle `joueur`. Testé de bout en bout contre la vraie API (Puppeteer,
      3 comptes : organisateur avec plusieurs événements dont des terminés,
      participant avec un événement terminé, joueur refusé — vérifié absent
      partout). 77 tests Jest toujours au vert (5 fichiers de test mis à jour
      pour la nouvelle dépendance d'`EvenementService`)
- [x] Découpage du code par route (22/09/2026, à la demande du porteur de
      projet). `App.tsx` : `/` (`CarteRecherche`) reste importée directement
      (premier écran vu par presque tout le monde), les six autres routes
      passent par `React.lazy` + `Suspense` — leur code JavaScript n'est
      téléchargé qu'à la navigation, pas au chargement initial. Les
      composants concernés sont exportés nommément (`export const X`), pas
      par défaut : `lazy()` exige un export par défaut, d'où un
      `.then((m) => ({ default: m.X }))` pour adapter l'un vers l'autre.
      Gain mesuré : paquet JS initial passé de 880 Ko à 442 Ko (`FicheEvenement`,
      qui embarque Leaflet, est désormais le plus gros morceau séparé —
      chargé seulement en visitant une fiche). Fait disparaître l'avertissement
      Vite présent depuis le début du projet ("Some chunks are larger than
      500 kB"). Bug trouvé en testant : le test E2E `profil.spec.ts` a
      commencé à échouer par intermittence après ce changement — pas une
      régression du découpage lui-même, mais un bug déjà présent dans
      `ProfilPage` (`e2e/pages/ProfilPage.ts`) que le délai supplémentaire du
      chargement du code a rendu visible : `.isVisible()` vérifie l'instant
      présent sans réessayer, contrairement à `expect().toBeVisible()`.
      Corrigé (`waitFor({ state: "visible" })` ajouté avant l'inspection du
      contenu). Vérifié : build (plusieurs fichiers séparés confirmés),
      navigation réelle sur les 7 routes sans erreur (Puppeteer), suite E2E
      complète toujours à 11/11 après correctif

> **Écart de périmètre entre la maquette et ce fichier** (relevé le 14/09/2026 ;
> partie "Profil" refermée le 20/09/2026 ; partie "Fiabilité" refermée le
> 23/09/2026, voir section "Évaluations" plus bas) : la maquette fournie
> montrait des pages "Mes événements" et "Profil" (nav + barre d'onglets
> mobile), ainsi qu'un score de **"Fiabilité"** par joueur affiché à côté de
> chaque inscrit. Les deux sont désormais construits. Écart résiduel mineur :
> la maquette montrait la fiabilité à côté de chaque inscrit dans la liste des
> joueurs ; elle est affichée à côté du nom de l'organisateur sur la fiche
> événement à la place (c'est l'organisateur qui est noté, pas les inscrits
> entre eux — voir section "Évaluations" pour le raisonnement).

### Présences
- [x] Marquage manuel (secours) — `POST /evenements/:id/presences/manuel`, testé
      (200, 409 si le joueur n'est pas inscrit/accepté, 403 si pas l'organisateur)
- [x] Génération du jeton QR côté serveur — `GET /evenements/:id/presences/jeton`,
      testée (JWT court avec `type:"presence"`, refusé si pas le jour de l'événement
      ou pas inscrit/accepté)
- [x] Affichage du QR côté joueur — sur la fiche événement, visible seulement le
      jour de l'événement pour un joueur inscrit et accepté (même règle que le
      serveur, dupliquée côté front pour éviter un bouton qui échouerait
      systématiquement en dehors de ce jour). Jeton demandé à la demande (pas au
      chargement de la fiche), encodé en QR via `qrcode.react` (nouvelle
      dépendance, cf. CLAUDE.md section 7). Testé de bout en bout contre la vraie
      API : refusé hors du jour de l'événement, refusé si pas inscrit/accepté,
      jeton obtenu pour un joueur inscrit le jour même
- [x] Scan côté organisateur — `POST /evenements/:id/presences/scan`, testé (200,
      403 si pas l'organisateur, 400 si jeton invalide/expiré/mauvais événement,
      400 si un jeton d'authentification classique est présenté à la place).
      Écran caméra ajouté côté front le 20/09/2026 (jusqu'ici testé par API
      seulement, comme le marquage manuel, malgré le choix
      `html5-qrcode` déjà acté en section 7 : repéré en accompagnant le
      porteur de projet, qui pensait le blocage lié à l'API en local plutôt
      qu'à un écran manquant). `useScannerPresence` pilote `html5-qrcode`
      (nouvelle dépendance), scan en continu (plusieurs joueurs à la suite
      sans rouvrir l'écran). Bouton "Marquer présent" ajouté au même moment
      dans la liste des inscrits (existait côté API, jamais câblé non plus).
      Les deux réservés à l'organisateur, jour de l'événement seulement (même
      fenêtre que la génération du jeton). Vérifié : marquage manuel de bout
      en bout (vraie API), ouverture/fermeture caméra sans plantage
      (Puppeteer, caméra virtuelle Chrome) — la lecture réelle d'un QR par une
      caméra physique n'est pas simulable en environnement de test, mais
      repose sur le même endpoint déjà validé par curl (PRES-04)
- [x] Passage en statut "Terminé" — `POST /evenements/:id/terminer`, testé (204,
      403 si pas l'organisateur, 409 si déjà terminé, 409 si l'événement n'a
      pas encore commencé — voir plus bas, 24/09/2026). Bouton "Terminer
      l'événement" ajouté côté front le 19/09/2026 (jusqu'ici accessible par
      API seulement), révisé le 20/09/2026 : jamais bloqué par les présences
      (un simple absent aurait sinon empêché de clôturer pour toujours,
      remarque du porteur de projet) — le nombre de présents pointés
      (`presence`, exposé dans `GET /evenements/:id/inscriptions`,
      `InscritDetail`) n'est qu'une information affichée au moment de
      confirmer, jamais une condition. Confirmation en deux temps comme
      l'annulation. Bug corrigé au passage (19/09) : `estOrganisateur` se
      basait sur `etat` (`useFicheEvenement`), qui retombe à `"termine"` pour
      tout le monde une fois l'événement clos — faisait réapparaître le
      bouton "Signaler" pour l'organisateur sur son propre événement terminé.
      Recalculé sur l'identité (`utilisateur.id === evenement.idOrganisateur`),
      stable quel que soit le statut. Vérifié de bout en bout (Puppeteer +
      vraie API)
- [x] Refus de terminer un événement qui n'a pas encore commencé (24/09/2026,
      repéré par le porteur de projet en regardant le test E2E d'évaluation
      tourner en `--headed` : l'événement de test était programmé dans le
      futur, et pourtant "Terminer l'événement" fonctionnait immédiatement —
      "sinon tu l'annules en fait", remarque exacte). Rien ne vérifiait la
      date jusqu'ici : `EvenementService.terminer` se contentait de la
      permission (organisateur) et de l'état (pas déjà terminé). Ajout d'une
      vérification sur `dateDebut` uniquement, pas `dateFin` — un organisateur
      doit pouvoir clôturer avant l'heure de fin prévue si tout le monde a
      fini de jouer, cohérent avec la révision du 20/09/2026 qui refuse déjà
      de bloquer sur les présences pour la même raison. `409 "Cet événement
      n'a pas encore commencé"`. A cassé de bout en bout le test E2E
      d'évaluation (voir section Qualité et déploiement) : l'événement y
      était créé plusieurs jours dans le futur puis terminé aussitôt, comme
      quatre tests Jest qui suivaient le même raccourci (`service.creer()`
      suivi immédiatement de `service.terminer()`) — les cinq corrigés
      (événement injecté directement avec une `dateDebut` passée via le
      double, ou clôturé directement via le repository quand seul l'état
      "déjà terminé" important pour le test). Testé : 97 tests Jest (back,
      +1) + vérifié contre la vraie API (409 confirmé sur un événement à 4
      jours) + suite E2E complète (12/12) toujours au vert après correction
- [x] Clôture automatique de secours (21/09/2026, à la demande du porteur de
      projet — repéré en observant un événement resté "Ouvert" alors qu'il
      était largement passé, faute de clic organisateur sur "Terminer
      l'événement"). `EvenementService.terminerEvenementsExpires` clôture tout
      événement actif dont `date_fin` dépasse une marge de 3h (délai discuté
      et validé avec le porteur de projet), appelé par un `setInterval` dans
      `server.ts` (toutes les 30 min + un passage immédiat au démarrage) —
      pas de nouvelle dépendance, pas de cron externe. Opération idempotente
      (`WHERE id_statut_event != Termine`), sans risque en cas de double
      exécution. Testé (Jest : événement à 4h dépasse la marge → clôturé,
      à 1h → laissé tel quel ; vérifié aussi en base réelle, événement
      backdaté manuellement puis clôturé au redémarrage du serveur)

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
- [x] Vue d'ensemble sur `/admin` (22/09/2026, à la demande du porteur de
      projet — inspirée d'une idée de dashboard analytique vue sur un autre
      projet, mais délibérément simplifiée : ce projet-là utilisait une
      **seconde base de données (MongoDB)** rien que pour ça, écarté ici comme
      inutile — la stack impose PostgreSQL, et les données existent déjà dans
      les tables `evenement`/`utilisateur`). Quatre chiffres, pas de
      graphique, pas de nouvelle dépendance : événements créés (total),
      actifs (Ouvert + Complet), terminés, joueurs inscrits. `ModerationService`
      s'appuie sur `EvenementRepository.compterParStatut` et
      `UtilisateurRepository.compterJoueurs` (comptages SQL directs, exclut
      les événements annulés des colonnes "actifs"/"terminés" mais pas du
      total). Route `GET /moderation/statistiques`, réservée admin. Testé :
      1 test Jest (85 au total) + vérifié en navigateur réel (Puppeteer,
      chiffres cohérents avec la base de dev)
- [x] Liste filtrable de tous les événements sur `/admin` (22/09/2026, à la
      demande du porteur de projet, en complément de la vue d'ensemble
      ci-dessus) — contrairement aux "Signalements en attente", pas limitée
      à ce qui a été signalé : un admin peut parcourir/superviser
      proactivement. Filtres statut (Ouvert/Complet/Terminé/Annulé) et plage
      de date de début, combinables. Point d'attention technique : "Annulé"
      ne correspond à aucune ligne réellement posée dans `statut_event` (la
      table a bien une entrée "Annule", mais rien dans le code applicatif ne
      s'en sert — l'annulation est encodée uniquement par
      `date_desactivation`). Le filtre "Annulé" traduit donc ce cas en
      `dateDesactivation IS NOT NULL`, jamais en jointure sur le libellé de
      statut ; la réponse API expose un `estAnnule` explicite pour que le
      front n'ait pas à deviner. `EvenementRepository.listerTousAdmin`,
      `ModerationService.listerEvenements`, route `GET /moderation/evenements`
      (réservée admin). Hook dédié `useEvenementsAdmin` côté front (séparé de
      `useModeration` : un hook, une responsabilité). Écarté délibérément :
      pas de tri, pas de recherche texte, pas de pagination — au-delà du
      volume de test accumulé pendant cette session (~200 événements), ça
      resterait à revoir. Testé : 2 tests Jest (87 au total) + vérifié en
      navigateur réel (Puppeteer, filtre "Annulé" puis "Ouvert", badges
      cohérents dans les deux cas)

### Notifications
- [x] Notifications in-app + email générique (21/09/2026, à la demande du
      porteur de projet — pas d'app mobile, donc pas de push : une cloche
      dans l'en-tête plutôt qu'une multiplication d'emails détaillés).
      Table `notification` (absente du MCD initial, écart documenté ci-dessous,
      même traitement que `photo`/`format` en leur temps). Déclenchée depuis
      `InscriptionService`/`EvenementService` via le port `NotificationInterface`
      (même rôle architectural que `GeocodeurInterface` — `NotificationService`
      l'implémente, wrapping `NotificationRepositoryInterface` + un second port
      `NotificationEmailInterface` implémenté par `NotificationEmailNodemailer`,
      compte de test Ethereal créé à la volée). L'email est volontairement
      générique ("Vous avez une nouvelle notification..."), jamais le détail —
      un échec d'envoi n'empêche jamais l'action métier ni la notification
      en base (erreur avalée et journalisée). Cinq déclencheurs : demande sur
      événement privé → organisateur ; réponse à une demande (acceptée/refusée)
      → demandeur ; passage à "Complet" → organisateur ; annulation →
      chaque inscrit accepté ; passage à "Terminé" → chaque inscrit accepté
      (5ᵉ déclencheur, `evenement_termine`, ajouté le 24/09/2026 — voir
      ci-dessous). `GET /notifications` + `POST /notifications/:id/lue`.
      Front : cloche dans `Entete.tsx` (`ClocheNotifications.tsx`,
      `useNotifications.ts`), rafraîchissement toutes les 30s, clic = marque
      lu + navigue vers l'événement. Résout les deux points notés plus bas
      dans "Évolutions envisagées" (email à l'annulation, signaler une demande
      en attente) — les deux entrées y sont conservées mais marquées résolues.
      Testé : 4 tests Jest (`notificationService.test.ts`) + les 4 déclencheurs
      vérifiés contre la vraie API (curl) + email généré consulté sur Ethereal
      + cloche vérifiée en navigateur réel (Puppeteer : compteur, contenu,
      clic → navigation + marquage lu persistant)
- [x] Déclencheur "événement terminé" (24/09/2026, à la demande du porteur de
      projet — repéré en discutant du système d'évaluation : rien ne ramenait
      un joueur sur la fiche une fois l'événement clos pour qu'il puisse noter
      l'organisateur, incohérent avec le reste du système de notification déjà
      en place). `"evenement_termine"` ajouté à `TypeNotification`, envoyé à
      chaque inscrit accepté (pas l'organisateur, il ne s'auto-évalue pas) —
      factorisé dans `EvenementService.notifierInscritsAcceptes` (méthode
      privée, réutilisée aussi par `annuler`), appelé à la fois par `terminer`
      (clôture manuelle) et par `terminerEvenementsExpires` (filet de sécurité
      automatique, voir section Présences) : un organisateur qui oublie de
      clôturer ne doit pas priver ses inscrits du signal pour évaluer.
      Nécessitait de changer `EvenementRepository.terminerAvantDate` pour
      renvoyer les identifiants clôturés plutôt qu'un simple compte (un
      `updateMany` seul ne renvoie pas les lignes affectées) — `findMany` puis
      `updateMany` sur les mêmes identifiants côté implémentation Prisma.
      Testé : 2 tests Jest supplémentaires (clôture manuelle et automatique,
      `NotificationFake.appels`, 96 au total) + vérifié contre la vraie API
      (curl : clôture manuelle → notification immédiate) et contre la vraie
      base (script direct pour simuler la clôture automatique sans attendre
      le vrai délai de 30 min — notification + email réel envoyés) + cloche
      vérifiée en navigateur réel (Puppeteer : les deux notifications
      affichées avec le bon libellé)

### Évaluations
- [x] Notation de l'organisateur par les joueurs (23/09/2026, à la demande du
      porteur de projet — "des couleurs de badges" avait ouvert la discussion
      sur ce qui restait à faire, résolvant ensuite le point noté depuis le
      20/09/2026 dans "Évolutions envisagées"). Qui note qui découle du
      modèle de données plutôt que d'un choix arbitraire : la clé primaire de
      la table `evaluation` est `(id_joueur, id_evenement)` — une seule note
      par joueur et par événement, ce qui exclut mécaniquement la notation
      entre joueurs (il faudrait un second `id_joueur`) et retient "chaque
      joueur accepté note l'organisateur". Réservé à un joueur inscrit et
      accepté (pas un simple demandeur en attente/refusé), non-organisateur,
      une fois l'événement réellement "Termine" (pas "Annule"). Pas de
      condition sur la présence pointée : le scan QR est un secours, pas
      systématique (même raisonnement que pour terminer l'événement, voir
      section Présences) — un joueur venu sans avoir été scanné doit pouvoir
      noter. Doublon (déjà noté) refusé par la contrainte de clé primaire,
      pas par une vérification applicative dédiée.
      Architecture : copie conforme du pattern `Signalement`/`Presence` — pas
      de couche supplémentaire pour autant (`EvaluationRepositoryInterface`
      + `EvaluationRepositoryDatabase`/`Fake`, `EvaluationService`,
      `EvaluationController`, route `POST /evenements/:id/evaluations`
      montée sur le router `/evenements` existant). Ferme au passage l'écart
      de périmètre maquette sur le score de **"Fiabilité"** (voir plus haut) :
      `OrganisateurDetail.fiabilite` (moyenne des notes reçues sur tous ses
      événements, `null` tant qu'aucune n'existe), composée dans
      `EvenementService.trouverDetailParId` via
      `EvaluationRepository.moyenneParOrganisateur` — pas dans
      `EvenementRepository`, qui ne connaît pas la table `evaluation` (une
      seule responsabilité par repository). Affichée sur la fiche événement,
      à côté du nom de l'organisateur — identiquement sur chacun de ses
      événements, puisque c'est une moyenne par organisateur et non par
      événement (pas de profil public par joueur dans le périmètre actuel
      pour l'afficher ailleurs — clarifié avec le porteur de projet le
      24/09/2026, volontairement pas construit ici).
      CSS revu le 24/09/2026 (retour du porteur de projet : la première
      version, un simple texte gris à la suite du nom, "passait totalement
      inaperçue") — pastille `.pastille-fiabilite` dédiée ("★ 4.0/5", fond et
      texte ambre), plutôt qu'un texte discret noyé dans la ligne
      "Organisé par...".
      Front : bouton "Évaluer l'organisateur" sur la fiche événement (même
      forme que "Signaler un problème"), visible via
      `useFicheEvenement.peutEvaluer` (mêmes règles que ci-dessus, calculées
      côté front pour l'affichage — revérifiées côté back de toute façon).
      Limite assumée : le front ne sait pas qu'un joueur a déjà noté tant
      qu'il n'a pas rechargé la page (pas de champ dédié exposé sur la fiche
      événement pour ça, jugé disproportionné pour ce cas) — une nouvelle
      tentative après rechargement affiche simplement le message d'erreur
      409 du back ("Vous avez déjà évalué cet événement"), pas une régression
      silencieuse.
      Bug trouvé en testant : `EvaluationRepositoryDatabase.moyenneParOrganisateur`
      filtrait sur `evenement.idOrganisateur`, qui n'existe pas côté Prisma —
      le champ généré est `idJoueur` (mappé sur `id_joueur`), `idOrganisateur`
      n'existe que côté entité de domaine (`Evenement.idOrganisateur`,
      renommé dans `EvenementRepositoryDatabase.versEntite`). Provoquait un
      500 sur `GET /evenements/:id` dès qu'un événement avait un
      organisateur. Corrigé, revérifié contre la vraie API.
      Testé : 5 tests Jest sur `EvaluationService` (succès, événement
      introuvable, auto-évaluation refusée, événement pas encore terminé,
      joueur non accepté) + 2 sur la fiabilité (`EvenementService`), 94 au
      total. Vérifié de bout en bout contre la vraie API (curl : refus avant
      clôture, refus auto-évaluation, succès, doublon 409, fiabilité recalculée)
      et en navigateur réel (Puppeteer : badge "Fiabilité 4.0/5" affiché,
      message d'erreur clair sur une seconde tentative).

### Qualité et déploiement
- [x] Tests Jest sur la couche Service — 76 tests, 8 services (Auth, Evenement,
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
- [x] Tests E2E (22/09/2026, structure inspirée d'un autre projet du porteur —
      Playwright + Page Object Model, mais implémenté proprement à travers
      l'UI plutôt que ce projet de référence qui court-circuitait ses propres
      couches). Nouveau dossier `e2e/` à la racine (pas dans `backend/` ni
      `frontend/` : un test E2E vérifie tout le système à la fois, n'appartient
      à aucun des deux) — `pages/` (Page Objects), `tests/` (specs), `utils/`
      (comptes/événements de test via l'API réelle, plus rapide et fiable que
      de repasser par l'UI pour la préparation). 12 tests, 6 fichiers :
      authentification, création d'événement, inscriptions (public direct,
      privé accepté, privé refusé — vérifie au passage le correctif du
      20/09/2026 sur la demande refusée), profil, recherche + pagination,
      évaluation (24/09/2026, à la demande du porteur de projet, qui voulait
      voir le parcours complet joueur+organisateur en `--headed` — jusqu'ici
      seulement vérifié par des scripts Puppeteer jetables, jamais dans la
      suite permanente). Ce dernier spec enchaîne : inscription à un
      événement public, clôture par l'organisateur, notification reçue par le
      joueur (cloche), clic dessus (marque lu + navigue), évaluation notée,
      pastille de fiabilité affichée — organisateur préparé via l'API
      (création d'événement déjà couverte par `creation-evenement.spec.ts`,
      pas la peine de la dupliquer ici). A nécessité d'étendre
      `FicheEvenementPage` (`terminerEvenement`, `evaluerOrganisateur`,
      `pastilleFiabilite`) et `EntetePage` (`texteNotifications`,
      `cliquerPremiereNotification`, `badgeNotifications`).
      Bug trouvé en écrivant ce spec : `EntetePage.boutonCloche` utilisait
      `.locator(".cloche-notifications-bouton").first()` — l'en-tête rend
      deux instances de la cloche (mobile + desktop, repli CSS selon la
      largeur, voir CLAUDE.md "Responsive"), et contrairement à
      `boutonDeconnexion`/`lienConnexionInscription` plus haut (qui passent
      par `getByRole`, lequel exclut déjà les éléments `display:none` de
      l'arbre d'accessibilité), un `.locator()` sur une classe CSS renvoie
      tous les éléments du DOM sans filtrer sur la visibilité — et la
      variante mobile (cachée en desktop) apparaît EN PREMIER dans le DOM
      (voir `Entete.tsx`). Le test échouait ("element is not visible") en
      cliquant sur le bouton caché. Corrigé en scopant explicitement sur
      `.entete-compte--desktop`, plutôt qu'un `.first()` qui ne marchait que
      par coïncidence pour les deux autres locators.
      Second bug trouvé en le regardant tourner en `--headed` (24/09/2026,
      remarque du porteur de projet — l'événement du scénario était
      programmé dans plusieurs jours, et se terminait pourtant aussitôt) :
      révélait l'absence de vérification de date sur "Terminer l'événement"
      côté back, corrigée dans la foulée (voir section Présences). A dû être
      réécrit en conséquence : dateDebut à quelques secondes plutôt que
      plusieurs jours (le joueur doit rejoindre avant cette échéance —
      `verifierInscriptionPossible` refuse déjà de rejoindre un événement
      commencé, règle préexistante — puis l'organisateur clôturer après,
      d'où une attente explicite entre les deux dans le test).
      Contre l'appli réelle tournant en local (front+back+base), jamais de
      mock — les tests Jest isolent déjà la couche Service, ceux-ci vérifient
      le comportement observable de bout en bout. Deux points relevés en
      testant :
      1. `workers: 1` obligatoire — en parallèle, les tests se
         marchent dessus sur la vraie base (contention sur les transactions
         `Serializable` du contrôle des places notamment), vérifié en pratique
         (mêmes tests, échouent en parallèle, passent en série).
      2. Le géocodage n'est jamais mocké (`GeocodageService` appelle la vraie
         API Adresse du gouvernement à chaque événement créé, sans cache —
         voir "Évolutions envisagées") : un test qui en crée beaucoup de suite
         peut essuyer un 503 "service indisponible" si le débit est trop
         élevé. Reprise automatique avec délai croissant dans les utilitaires
         de test, pas de mock introduit pour contourner — cohérent avec le
         choix de tester contre le vrai système. Limite connue et assumée :
         relancer la suite plusieurs fois d'affilée en quelques minutes peut
         occasionnellement échouer côté géocodage, un run isolé ne pose pas
         ce problème.
      Chrome système (`channel: "chrome"`) plutôt que le Chromium propre à
      Playwright — téléchargement propre à Playwright très lent dans cet
      environnement, le binaire système déjà installé fait exactement le
      même travail pour ces tests.
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
adresse       VARCHAR(255)    -- 255 et non 50 : voir note ci-dessous
code_postal   VARCHAR(50)
type_terrain  VARCHAR(50)
latitude      DECIMAL(10,7)   -- issu du géocodage
longitude     DECIMAL(10,7)   -- issu du géocodage
photo         BYTEA           -- À AJOUTER au MCD (absent actuellement)
photo_type    VARCHAR(100)    -- type MIME de la photo ; À AJOUTER au MCD
```

> La position géographique est portée par **lieu**, pas par evenement.

> **`lieu.adresse` en VARCHAR(255) et non 50** (corrigé le 18/09/2026, bug
> trouvé en testant : création d'événement en `500` pour toute adresse un peu
> longue). La colonne stocke le `label` complet renvoyé par l'API Adresse du
> gouvernement (numéro + rue + code postal + ville, ex. "Avenue du Maréchal
> Foch, Boulogne-Billancourt"), qui dépasse régulièrement 50 caractères —
> l'insertion Prisma échouait côté PostgreSQL (`P2000`, valeur trop longue),
> remontée en `500` générique sans message utile côté front. `ville` et
> `code_postal` restent à 50 : jamais aussi longs en pratique.

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

### notification
```
id_notification  INT PK          -- À AJOUTER au MCD Looping (absente actuellement)
id_joueur        INT FK          -- destinataire
id_evenement     INT FK
type             VARCHAR(30)     -- fermé côté TypeScript uniquement (TypeNotification),
                                 -- pas de table de référence dédiée — même choix que
                                 -- rejoint.statut_inscription, pour la même raison
lu               BOOLEAN
date_creation    DATETIME
```

> Ajoutée le 21/09/2026 (voir section "Notifications"). Pas de champ texte
> stocké : le message s'affiche uniquement composé côté front à partir de
> `type` + le titre de l'événement (jamais dupliqué en base, jamais dans
> l'email — voir section Notifications).

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
- La table `notification` (entière) doit être ajoutée au MCD Looping (absente
  actuellement, voir section "Modèle de données")

## Évolutions envisagées (hors périmètre initial)

> **EN COURS DE DÉCISION (24/09/2026) — à reprendre en premier à la prochaine
> session.** Deux sujets en suspens, discutés juste avant une coupure de
> session (redémarrage machine prévu par le porteur de projet) :
>
> 1. **Chantier AWS/Jenkins/Kubernetes.** Le porteur de projet pensait ce
>    déploiement réel obligatoire ; ses collègues lui ont indiqué que la
>    compétence visée est en réalité *« Préparer et documenter le déploiement
>    d'une application »*, qui porte sur :
>    - la procédure de déploiement rédigée
>    - les scripts de déploiement écrits et documentés
>    - les environnements de test définis + la procédure d'exécution des
>      tests d'intégration, système et d'acceptation client rédigée
>    - un système de veille sur les évolutions technologiques et les
>      problématiques de sécurité liées au déploiement
>
>    Un vrai déploiement en production n'est donc **pas strictement requis**
>    ("c'est mieux si c'est le cas", mais pas la compétence elle-même). Le
>    porteur de projet récolte encore des informations avant de trancher le
>    niveau d'ambition (documentation seule vs déploiement AWS réel). Ne pas
>    commencer le `Jenkinsfile`/les manifests Kubernetes ni quoi que ce soit
>    côté AWS avant qu'il revienne là-dessus explicitement — discussion
>    interrompue en plein choix de scope, pas une validation.
>    Rappel de ce qui existe déjà et pourrait nourrir la documentation quel
>    que soit le niveau retenu : `docker-compose.yml` + Dockerfiles
>    (`backend/Dockerfile`, `frontend/Dockerfile`) fonctionnels et testés de
>    bout en bout (voir section Socle), suite Jest (97 tests) + suite E2E
>    Playwright (12 tests) déjà en place et documentées (section Qualité et
>    déploiement) — une bonne partie de la matière pour "environnements de
>    test définis + procédure d'exécution" existe donc déjà, à formaliser en
>    document plutôt qu'à reconstruire.
>
> 2. **Double authentification (2FA)** — simplement évoquée ("possible qu'on
>    mette en place ça aussi"), aucune décision, aucun détail (SMS ? TOTP/
>    app d'authentification ? réservé à l'admin ou à tous les comptes ?). À
>    clarifier avec le porteur de projet avant d'esquisser quoi que ce soit.

**Cache Redis sur le géocodage.** Une adresse résolue ne change jamais : ses coordonnées
peuvent être mises en cache sans risque d'obsolescence. Utile si plusieurs événements
sont créés au même endroit (terrain municipal, city stade régulier). À ne pas étendre
aux événements eux-mêmes : places restantes et inscriptions évoluent en permanence,
les mettre en cache reviendrait à servir des données fausses.

**Système d'évaluation entre joueurs** — ✅ **résolu le 23/09/2026**, voir
section "Évaluations" du suivi. "Qui note qui" s'est tranché par la
contrainte de clé primaire de la table `evaluation` (`id_joueur`,
`id_evenement`) plutôt que par un choix arbitraire : chaque joueur accepté
note l'organisateur, pas l'inverse, pas entre joueurs. La moyenne
("Fiabilité") s'affiche sur la fiche événement, à côté du nom de
l'organisateur. Point non traité, volontairement : la modération des
commentaires abusifs — pas de workflow dédié, un admin pourrait supprimer
une évaluation en base au besoin, à construire seulement si le besoin se
confirme en usage réel.

**Notification par email lors de l'annulation d'un événement** — ✅ **résolu le
21/09/2026**, voir section "Notifications" du suivi. Absorbé dans le système
de notification général (`evenement_annule`) plutôt que traité comme un cas
à part : le périmètre initialement prévu ici ("ce seul cas, pas de système
général") a été volontairement dépassé à la demande du porteur de projet, qui
voulait couvrir plusieurs actions d'un coup (demande, réponse, complet,
annulation). Entrée conservée pour l'historique de la décision.

**Signaler à l'organisateur qu'une demande d'inscription l'attend** — ✅
**résolu le 21/09/2026**, voir section "Notifications". La cloche de l'en-tête
(`nouvelle_demande`) remplace l'idée de badge sur la carte Profil envisagée
ci-dessous un temps — plus général, couvre aussi les réponses aux demandes et
les événements complets/annulés avec le même mécanisme. Entrée conservée pour
l'historique de la décision.

**Couleur du badge "Privé"** (discuté le 15/09/2026, mis de côté volontairement
— priorité à la recette manuelle en cours). Le badge est aujourd'hui gris
neutre (classe `.badge`), aux 3 endroits où il apparaît (`CarteRecherche.tsx`,
`CreationAnnonce.tsx`, `FicheEvenement.tsx`). Piste envisagée : le distinguer
visuellement en rouge — écartée en l'état, ce rouge (`.badge--alerte`) est
déjà utilisé pour le badge "Complet" (état bloquant, on ne peut pas rejoindre)
et réutiliser la même couleur mélangerait deux badges de nature différente
sur la même carte ("Privé" se rejoint très bien, juste sur validation). Si le
besoin de distinguer "Privé" reste, repartir sur une couleur à part (ambre,
déjà dans les tokens `index.css`) plutôt que le rouge existant.

**Redirection après clôture d'un événement, vers l'écran Profil** (discuté le
20/09/2026, mis de côté — l'écran Profil existe désormais, voir section Front
React, mais ce lien-là n'a pas été ajouté). Aujourd'hui, `terminerEvenement`
(`useFicheEvenement.ts`) ne redirige nulle part : la fiche se recharge sur
place et reste affichée (volontaire — contrairement à l'annulation,
l'événement terminé reste consultable, cf. commentaire dans le code). Ne pas
remplacer ça par une redirection automatique forcée (arracherait
l'organisateur d'une page qu'il veut souvent encore consulter juste après
confirmation — présences, bilan) : plutôt ajouter un lien discret type "Voir
mes événements" à ce moment-là, vers `/profil`.

**Couleur des badges de statut "Terminé"/"Annulé"** (résolu le 22/09/2026).
Historique : un premier passage (20/09/2026) avait donné à "Terminé" un
traitement volontairement estompé (`.badge--sourdine`, opacité 0.7, sans
couleur propre) pour qu'il s'efface visuellement — pari qui ne s'est confirmé
qu'une fois un écran à plusieurs statuts construit (`/admin`, "Tous les
événements", avec Ouvert/Complet/Terminé/Annulé côte à côte). Sur cet écran,
le badge estompé et le badge "Annulé" (resté sur `.badge` neutre, gris sur
fond clair) devenaient tous les deux quasi invisibles à côté des badges
colorés "Ouvert"/"Complet" — retour explicite du porteur de projet
("des couleurs qu'on les voit vraiment, pas juste du gris sur du blanc").
Remplacé par deux couleurs à part, cohérentes avec le principe déjà posé pour
"Privé" ci-dessus (ne pas réutiliser le rouge de "Complet" ni le vert
"Ouvert"/niveau/"Présent") : "Terminé" en bleu (nouveaux tokens
`--bleu-texte`/`--bleu-clair`, classe `.badge--info`), "Annulé" en ambre
(tokens `--ambre-texte`/`--ambre-clair` déjà présents, jusque-là réservés à
`MessageConfirmation`, classe `.badge--ambre`). `.badge--sourdine` supprimée
(plus aucun usage). Appliqué aux 3 endroits où "Terminé" apparaît
(`Admin.tsx`, `Profil.tsx`, `FicheEvenement.tsx`) et à "Annulé" sur
`Admin.tsx` (seul endroit où ce badge existe). Vérifié : `tsc --noEmit` +
build front sans erreur, 87/87 tests Jest back inchangés (changement
purement CSS/front), vérification visuelle Puppeteer sur `/admin` filtré par
statut (les deux couleurs bien rendues, capture d'écran).

---

## Instructions pour Claude Code

- Lire la section « Suivi d'avancement » en début de session pour savoir où en est le projet
- Cocher les cases correspondantes en fin de session, uniquement pour ce qui tourne
- Ne pas dévier du modèle de données ci-dessus sans le signaler explicitement
- Si un écart apparaît entre ce fichier et le code existant, le signaler avant de coder
- En cas de doute entre deux solutions, appliquer la règle de simplicité en tête de fichier
