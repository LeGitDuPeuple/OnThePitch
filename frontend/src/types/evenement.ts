export type StatutEvenement = "Ouvert" | "Complet" | "Termine" | "Annule";
export type NiveauRequis = "debutant" | "intermediaire" | "confirme" | "tous_niveaux";

export type Evenement = {
  id: number;
  titre: string;
  nombrePlaces: number;
  placesRestantes: number;
  estPrive: boolean;
  dateDebut: string;
  dateFin: string;
  statut: StatutEvenement;
  niveauRequis: NiveauRequis;
  idOrganisateur: number;
};

// Résultat de la recherche géolocalisée : un événement, enrichi de sa distance.
export type EvenementProche = Evenement & {
  distanceKm: number;
  ville: string;
  adresse: string;
};
