// Résultat d'un géocodage réussi.
export type Coordonnees = {
  latitude: number;
  longitude: number;
  adresse: string;
  ville: string;
  codePostal: string;
};

export interface GeocodeurInterface {
  // Convertit une adresse en coordonnées.
  // Lève une erreur métier si l'adresse est introuvable ou le service indisponible.
  geocoder(adresse: string): Promise<Coordonnees>;
}