import { GeocodeurInterface, Coordonnees } from "../domain/interface/geocodeurInterface";
import { RequeteInvalide, ServiceIndisponible } from "../domain/erreurMetier";

// Forme de la réponse de l'API Adresse (GeoJSON), typée explicitement.
type ReponseApiAdresse = {
  features: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      label: string;
      city: string;
      postcode: string;
    };
  }>;
};

export class GeocodageService implements GeocodeurInterface {
  constructor(
    private readonly urlApi = "https://api-adresse.data.gouv.fr/search"
  ) {}

  // Convertit une adresse en coordonnées via l'API Adresse du gouvernement.
  async geocoder(adresse: string): Promise<Coordonnees> {
    const url = `${this.urlApi}/?q=${encodeURIComponent(adresse)}&limit=1`;

    let reponse: Response;

    try {
      reponse = await fetch(url);
    } catch {
      throw new ServiceIndisponible("Service de géocodage indisponible, réessayez plus tard");
    }

    if (!reponse.ok) {
      throw new ServiceIndisponible("Service de géocodage indisponible, réessayez plus tard");
    }

    const donnees = (await reponse.json()) as ReponseApiAdresse;
    const resultat = donnees.features[0];

    // L'API renvoie une liste vide quand elle ne reconnaît pas l'adresse.
    if (!resultat) {
      throw new RequeteInvalide("Adresse introuvable, vérifiez la saisie");
    }

    // L'API renvoie [longitude, latitude], dans cet ordre.
    const [longitude, latitude] = resultat.geometry.coordinates;

    return {
      latitude,
      longitude,
      adresse: resultat.properties.label,
      ville: resultat.properties.city,
      codePostal: resultat.properties.postcode,
    };
  }
}