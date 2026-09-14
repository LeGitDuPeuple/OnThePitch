import { GeocodeurInterface, Coordonnees } from "../../src/domain/interface/geocodeurInterface";

// Double de test : renvoie des coordonnées fixes, ou relance l'erreur fournie
// (pour simuler une adresse introuvable ou un service indisponible).
export class GeocodeurFake implements GeocodeurInterface {
  constructor(private readonly resultat: Coordonnees | Error) {}

  async geocoder(): Promise<Coordonnees> {
    if (this.resultat instanceof Error) {
      throw this.resultat;
    }
    return this.resultat;
  }

  async suggerer(): Promise<Coordonnees[]> {
    if (this.resultat instanceof Error) {
      throw this.resultat;
    }
    return [this.resultat];
  }
}

export const coordonneesTest: Coordonnees = {
  latitude: 48.8566,
  longitude: 2.3522,
  adresse: "10 Rue de Rivoli 75004 Paris",
  ville: "Paris",
  codePostal: "75004",
};
