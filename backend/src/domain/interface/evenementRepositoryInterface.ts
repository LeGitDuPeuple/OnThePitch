import { Evenement, NiveauRequis } from "../entities/Evenement";

// Données nécessaires pour créer un lieu puis un événement.
export type NouvelEvenement = {
  titre: string;
  description?: string | null;
  format?: string | null;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  idOrganisateur: number;
  niveauRequis: NiveauRequis;
  lieu: {
    nom?: string | null;
    adresse: string;
    ville: string;
    codePostal: string;
    latitude: number;
    longitude: number;
    typeTerrain?: string | null;
  };
};

// Modification partielle d'un événement existant — jamais l'adresse/le lieu
// (voir schemas/evenementSchema.ts : redéclencherait un géocodage, hors périmètre).
export type ModificationEvenement = {
  titre?: string;
  description?: string;
  format?: string;
  nombrePlaces?: number;
  dateDebut?: Date;
  dateFin?: Date;
  niveauRequis?: NiveauRequis;
};

// Une ligne de résultat de la recherche géolocalisée, avec sa distance.
export type EvenementProche = {
  evenement: Evenement;
  distanceKm: number;
  nomLieu: string | null;
  ville: string;
  adresse: string;
  // Coordonnées du lieu — pour poser un marqueur sur la carte de recherche,
  // sans requête supplémentaire par événement.
  latitude: number;
  longitude: number;
};

// Détail d'un lieu, pour la fiche événement (carte, adresse complète).
export type LieuDetail = {
  nom: string | null;
  adresse: string;
  ville: string;
  codePostal: string;
  latitude: number;
  longitude: number;
  typeTerrain: string | null;
  aUnePhoto: boolean;
};

// Identité minimale de l'organisateur, pour l'affichage sur la fiche événement
// ("Organisé par ..."). idOrganisateur seul (déjà sur Evenement) ne suffit pas
// à afficher un nom sans requête supplémentaire côté front.
export type OrganisateurDetail = {
  nom: string;
  prenom: string;
  // Score de "Fiabilité" de la maquette d'origine (voir CLAUDE.md, écart de
  // périmètre) : moyenne des évaluations reçues sur tous ses événements.
  // Ajouté par EvenementService.trouverDetailParId (EvaluationRepository), pas
  // par ce repository — null tant qu'aucune évaluation n'existe encore.
  fiabilite: number | null;
};

export type EvenementDetail = {
  evenement: Evenement;
  lieu: LieuDetail;
  organisateur: OrganisateurDetail;
};

// Filtres de la vue d'ensemble admin (voir CLAUDE.md, section Modération).
// "Annule" n'est pas un statut réellement posé en base (voir plus bas) : il
// se traduit par dateDesactivation non nulle, pas par une jointure sur
// statut_event.
export type FiltresEvenementsAdmin = {
  statut?: "Ouvert" | "Complet" | "Termine" | "Annule";
  dateDebutMin?: Date;
  dateDebutMax?: Date;
};

export type EvenementAvecOrganisateur = {
  evenement: Evenement;
  organisateur: OrganisateurDetail;
};

export interface EvenementRepositoryInterface {
  // Crée le lieu et l'événement dans une même transaction.
  creer(donnees: NouvelEvenement): Promise<Evenement>;

  // Récupère un événement par son identifiant, avec son nombre d'inscrits.
  // Usage interne (règles métier des autres services) : ne charge pas le lieu.
  trouverParId(id: number): Promise<Evenement | null>;

  // Récupère un événement avec le détail de son lieu — pour la fiche événement.
  trouverAvecLieu(id: number): Promise<EvenementDetail | null>;

  // Modifie les champs fournis d'un événement existant, sans toucher au lieu.
  modifier(id: number, donnees: ModificationEvenement): Promise<Evenement>;

  // Recherche les événements publics à venir dans un rayon donné (en mètres),
  // triés par distance, avec pagination simple (skip/take).
  rechercherParRayon(
    longitude: number,
    latitude: number,
    rayonMetres: number,
    skip: number,
    take: number
  ): Promise<EvenementProche[]>;

  // Événements organisés par ce joueur (actifs ou terminés, jamais les annulés) —
  // pour l'écran Profil.
  listerParOrganisateur(idOrganisateur: number): Promise<Evenement[]>;

  // Compteurs pour la vue d'ensemble du tableau de bord admin.
  compterParStatut(): Promise<{ total: number; actifs: number; termines: number }>;

  // Liste tous les événements, tous organisateurs confondus, filtrable par
  // statut et par plage de date de début — vue d'ensemble admin (contrairement
  // à listerParOrganisateur, restreint à un seul joueur pour le Profil).
  listerTousAdmin(filtres: FiltresEvenementsAdmin): Promise<EvenementAvecOrganisateur[]>;

  // Marque un événement comme désactivé (soft delete).
  desactiver(id: number): Promise<void>;

  // Clôture l'événement une fois les présences relevées.
  terminer(id: number): Promise<void>;

  // Clôture automatiquement les événements actifs dont la date de fin précède
  // `dateLimite` (organisateur qui a oublié de cliquer "Terminer l'événement" —
  // voir CLAUDE.md, section Présences). Renvoie les identifiants clôturés
  // (pas juste un compte) : EvenementService en a besoin pour notifier les
  // inscrits de chaque événement concerné.
  terminerAvantDate(dateLimite: Date): Promise<number[]>;
}
