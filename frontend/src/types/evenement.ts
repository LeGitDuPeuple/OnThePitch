export type StatutEvenement = "Ouvert" | "Complet" | "Termine" | "Annule";
export type NiveauRequis = "debutant" | "intermediaire" | "confirme" | "tous_niveaux";
export type StatutInscription = "en_attente" | "acceptee" | "refusee";

export const LIBELLES_NIVEAU: Record<NiveauRequis, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
  tous_niveaux: "Tous niveaux",
};

export type Evenement = {
  id: number;
  titre: string;
  description: string | null;
  nombrePlaces: number;
  placesRestantes: number;
  estPrive: boolean;
  dateDebut: string;
  dateFin: string;
  statut: StatutEvenement;
  niveauRequis: NiveauRequis;
  idOrganisateur: number;
};

// Résultat de la recherche géolocalisée : un événement, enrichi de sa distance
// et des coordonnées de son lieu (pour le marqueur sur la carte).
export type EvenementProche = Evenement & {
  distanceKm: number;
  ville: string;
  adresse: string;
  latitude: number;
  longitude: number;
};

// Détail du lieu, renvoyé avec l'événement pour la fiche événement (GET /evenements/:id).
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

export type OrganisateurDetail = {
  nom: string;
  prenom: string;
};

export type EvenementDetail = Evenement & { lieu: LieuDetail; organisateur: OrganisateurDetail };

// Un inscrit tel que renvoyé par GET /evenements/:id/inscriptions.
export type InscritDetail = {
  idJoueur: number;
  nom: string;
  prenom: string;
  statut: StatutInscription;
};
