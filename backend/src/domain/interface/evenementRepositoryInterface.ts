import { Evenement, NiveauRequis } from "../entities/Evenement";

// Données nécessaires pour créer un lieu puis un événement.
export type NouvelEvenement = {
  titre: string;
  description?: string | null;
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
};

export type EvenementDetail = {
  evenement: Evenement;
  lieu: LieuDetail;
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

  // Recherche les événements publics à venir dans un rayon donné (en mètres).
  rechercherParRayon(
    longitude: number,
    latitude: number,
    rayonMetres: number
  ): Promise<EvenementProche[]>;

  // Marque un événement comme désactivé (soft delete).
  desactiver(id: number): Promise<void>;

  // Clôture l'événement une fois les présences relevées.
  terminer(id: number): Promise<void>;
}
