export interface CriteresRecherche {
  latitude: number;
  longitude: number;
  rayonMetres: number;
  limite: number;
}

export interface EvenementProche {
  id: number;
  titre: string;
  dateDebut: Date;
  nombrePlaces: number;
  nombreInscrits: number;
  adresse: string;
  ville: string;
  distanceMetres: number;
}

export interface EvenementRepositoryInterface {
  rechercherParRayon(criteres: CriteresRecherche): Promise<EvenementProche[]>;
}